/**
 * SketchBot SMS diagnostics (TAT-49) — "why didn't texting reply?"
 *
 * The webhook fails closed and stays quiet by design, so a broken channel
 * looks identical from a phone whether the cause is the flag, the signature
 * URL, the console wiring, or a carrier block. This script reads the Twilio
 * account and names the actual cause.
 *
 * It is READ-ONLY: it fetches config and message logs, and changes nothing.
 *
 *   node scripts/diagnose-twilio-sms.mjs [+1XXXXXXXXXX]
 *
 * Reads .env.local (same convention as the other scripts). To diagnose
 * production, run it with production's Twilio values — the credentials and
 * TWILIO_WEBHOOK_URL are what determine the answer.
 */
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import twilio from 'twilio';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, '../.env.local') });

const WEBHOOK_PATH = '/api/webhooks/twilio';
const ok = (m) => console.log(`  ✓ ${m}`);
const bad = (m) => console.log(`  ✗ ${m}`);
const warn = (m) => console.log(`  ! ${m}`);
const info = (m) => console.log(`    ${m}`);

/** Findings worth acting on, printed as the verdict. */
const problems = [];
/** Critical checks that could not be completed. Never report healthy with these. */
const incompleteChecks = [];

/**
 * The URL the SERVER will validate signatures against — identical precedence
 * to webhookValidationUrl() in the route. Any drift between this and the URL
 * configured in the console is a 403 on every genuine inbound.
 */
function expectedWebhookUrl() {
  const configured = (process.env.TWILIO_WEBHOOK_URL || '').trim();
  if (configured) return { url: configured, source: 'TWILIO_WEBHOOK_URL' };
  const base = (process.env.NEXT_PUBLIC_APP_URL || process.env.NEXT_PUBLIC_BASE_URL || '')
    .trim()
    .replace(/\/$/, '');
  if (base)
    return {
      url: `${base}${WEBHOOK_PATH}`,
      source: 'derived from NEXT_PUBLIC_APP_URL',
    };
  return { url: '', source: 'unresolvable' };
}

function mask(value) {
  if (!value) return '(unset)';
  return value.length <= 8 ? '****' : `${value.slice(0, 4)}…${value.slice(-4)}`;
}

function maskPhone(value) {
  if (!value) return '(unset)';
  return `•••${String(value).slice(-4)}`;
}

async function main() {
  console.log('\nSketchBot SMS — channel diagnostics\n');

  // ── 1. Local/server-side configuration ───────────────────────────────
  console.log('1. Configuration');
  const accountSid = process.env.TWILIO_ACCOUNT_SID || '';
  const authToken = process.env.TWILIO_AUTH_TOKEN || '';
  const serviceSid = process.env.TWILIO_MESSAGING_SERVICE_SID || '';
  const number = process.argv[2] || process.env.TWILIO_PHONE_NUMBER || '';

  if (process.env.SKETCHBOT_SMS_ENABLED === 'true') {
    ok('SKETCHBOT_SMS_ENABLED=true');
  } else {
    bad(
      `SKETCHBOT_SMS_ENABLED is "${process.env.SKETCHBOT_SMS_ENABLED ?? '(unset)'}" — the webhook 404s`
    );
    problems.push('Set SKETCHBOT_SMS_ENABLED=true in the deployment and redeploy.');
  }
  console.log(`    TWILIO_ACCOUNT_SID           ${mask(accountSid)}`);
  console.log(`    TWILIO_AUTH_TOKEN            ${authToken ? 'set' : '(unset)'}`);
  console.log(`    TWILIO_PHONE_NUMBER          ${maskPhone(number)}`);
  console.log(`    TWILIO_MESSAGING_SERVICE_SID ${mask(serviceSid)}`);

  const expected = expectedWebhookUrl();
  console.log(`    Server validates against     ${expected.url || '(unresolvable)'}`);
  info(`(source: ${expected.source})`);

  if (!accountSid || !authToken) {
    console.log('');
    bad('No credentials — cannot inspect the account.');
    info('Set TWILIO_ACCOUNT_SID and TWILIO_AUTH_TOKEN, then re-run.');
    console.log('');
    process.exit(1);
  }

  const client = twilio(accountSid, authToken);

  // ── 2. Credentials actually work ─────────────────────────────────────
  console.log('\n2. Account');
  try {
    const account = await client.api.v2010.accounts(accountSid).fetch();
    ok(`${account.friendlyName} — status "${account.status}"`);
    if (account.status !== 'active') {
      problems.push(
        `The Twilio account is "${account.status}", not active — messaging is suspended.`
      );
    }
  } catch (error) {
    bad(`Credentials rejected: ${error.message}`);
    problems.push('TWILIO_ACCOUNT_SID / TWILIO_AUTH_TOKEN are wrong or revoked.');
    printVerdict();
    return;
  }

  // ── 3. Where Twilio will actually POST an inbound message ────────────
  // The single most common cause of silence: the console URL and the URL
  // the server signs against are not byte-identical, so every real inbound
  // 403s and Twilio delivers nothing.
  console.log('\n3. Inbound webhook wiring');
  let effectiveUrl = '';
  let effectiveMethod = '';
  let numberUrl = '';
  let numberMethod = '';

  if (number) {
    try {
      const [found] = await client.incomingPhoneNumbers.list({
        phoneNumber: number,
        limit: 1,
      });
      if (!found) {
        bad(`${maskPhone(number)} is not an incoming number on this account`);
        problems.push(
          `${maskPhone(number)} does not belong to this Twilio account — check the number or the credentials.`
        );
      } else {
        ok(`${maskPhone(found.phoneNumber)} found`);
        info(
          `SMS capable: ${found.capabilities?.sms ? 'yes' : 'NO'} · MMS capable: ${found.capabilities?.mms ? 'yes' : 'no'}`
        );
        info(`Number smsUrl: ${found.smsUrl || '(none)'} [${found.smsMethod || '-'}]`);
        if (!found.capabilities?.sms) {
          problems.push(`${maskPhone(number)} has no SMS capability — it can never receive texts.`);
        }
        numberUrl = found.smsUrl || '';
        numberMethod = found.smsMethod || '';
        effectiveUrl = numberUrl;
        effectiveMethod = numberMethod;
      }
    } catch (error) {
      warn(`Could not read the number: ${error.message}`);
      incompleteChecks.push('incoming-number configuration');
    }
  } else {
    warn('No number given — pass one as an argument or set TWILIO_PHONE_NUMBER');
    incompleteChecks.push('incoming-number configuration');
  }

  if (serviceSid) {
    try {
      const service = await client.messaging.v1.services(serviceSid).fetch();
      ok(`Messaging Service "${service.friendlyName}"`);
      info(
        `Service inboundRequestUrl: ${service.inboundRequestUrl || '(none)'} [${service.inboundMethod || '-'}]`
      );
      info(`useInboundWebhookOnNumber: ${service.useInboundWebhookOnNumber}`);

      // A number must be in the sender pool for the service to govern it.
      let inPool = false;
      if (number) {
        try {
          const pool = await client.messaging.v1
            .services(serviceSid)
            .phoneNumbers.list({ limit: 100 });
          inPool = pool.some((p) => p.phoneNumber === number);
          if (inPool) {
            ok(`${maskPhone(number)} is in the service's sender pool`);
          } else {
            bad(`${maskPhone(number)} is NOT in the service's sender pool`);
            problems.push(
              `${maskPhone(number)} is not attached to Messaging Service ${mask(serviceSid)} — its A2P campaign and opt-out settings do not apply to it.`
            );
          }
        } catch (error) {
          warn(`Could not read the sender pool: ${error.message}`);
          incompleteChecks.push('Messaging Service sender-pool membership');
        }
      }

      // A service can govern this number only when the number is actually in
      // its sender pool. Otherwise Twilio keeps using the number-level URL.
      if (inPool && service.useInboundWebhookOnNumber) {
        effectiveUrl = numberUrl;
        effectiveMethod = numberMethod;
        info('→ Twilio will call the NUMBER webhook (above), not the service one.');
      } else if (inPool) {
        effectiveUrl = service.inboundRequestUrl || '';
        effectiveMethod = service.inboundMethod || '';
        info('→ Twilio will call the SERVICE webhook.');
      } else if (number) {
        info('→ This service does not govern the number; using the NUMBER webhook.');
      }
    } catch (error) {
      bad(`Could not read Messaging Service ${mask(serviceSid)}: ${error.message}`);
      problems.push(
        `TWILIO_MESSAGING_SERVICE_SID (${mask(serviceSid)}) is unreadable — wrong SID, or it belongs to another account.`
      );
    }
  }

  // The comparison that explains a 403-on-genuine-traffic.
  if (!effectiveUrl) {
    bad('No inbound webhook is configured — Twilio receives the text and calls nothing');
    problems.push(
      `Point the inbound webhook at ${expected.url || 'https://tatttester.com' + WEBHOOK_PATH} (Messaging Service → Integration, or the number's Messaging config).`
    );
  } else if (!expected.url) {
    warn('Cannot compare: the server-side validation URL is unresolvable');
    problems.push(
      'Set TWILIO_WEBHOOK_URL (or NEXT_PUBLIC_APP_URL) so the server knows what URL to validate against.'
    );
  } else if (effectiveUrl === expected.url) {
    ok('Console webhook matches the URL the server validates against, byte for byte');
  } else {
    bad('WEBHOOK URL MISMATCH — every genuine inbound will 403 and the texter gets nothing');
    info(`console:  ${effectiveUrl}`);
    info(`server:   ${expected.url}`);
    problems.push(
      `Make these identical: set TWILIO_WEBHOOK_URL="${effectiveUrl}" in the deployment, or change the console webhook to "${expected.url}".`
    );
  }
  if (effectiveUrl && String(effectiveMethod).toUpperCase() !== 'POST') {
    bad(
      `Inbound webhook method is "${effectiveMethod || '(unset)'}", but this route accepts POST only`
    );
    problems.push(
      'Set the active Twilio inbound webhook method to POST. GET requests receive 405 and no reply.'
    );
  } else if (effectiveUrl) {
    ok('Active inbound webhook method is POST');
  }

  // ── 4. A2P 10DLC — the classic "inbound works, replies vanish" ───────
  console.log('\n4. A2P 10DLC registration');
  if (serviceSid) {
    try {
      const campaigns = await client.messaging.v1
        .services(serviceSid)
        .usAppToPerson.list({ limit: 5 });
      if (campaigns.length === 0) {
        bad('No A2P campaign on this Messaging Service');
        problems.push(
          'Register an A2P 10DLC brand + campaign. US carriers block outbound SMS from unregistered 10DLC numbers (error 30034) — inbound still arrives, so texts look sent but no reply is ever delivered.'
        );
      }
      for (const campaign of campaigns) {
        const status = campaign.campaignStatus || 'unknown';
        if (String(status).toUpperCase() === 'VERIFIED') {
          ok(`Campaign ${mask(campaign.sid)} — ${status}`);
        } else {
          bad(`Campaign ${mask(campaign.sid)} — ${status}`);
          problems.push(
            `A2P campaign ${mask(campaign.sid)} is "${status}", not VERIFIED — carriers will block outbound replies (error 30034) until it is approved.`
          );
        }
      }
    } catch (error) {
      warn(`Could not read A2P campaigns: ${error.message}`);
      incompleteChecks.push('A2P campaign status');
    }
  } else {
    warn('No Messaging Service configured — A2P campaign status cannot be checked here');
    info(
      'A bare 10DLC number without a registered campaign has its outbound SMS blocked by US carriers.'
    );
    incompleteChecks.push('A2P campaign status');
  }

  // ── 5. What actually happened to recent traffic ──────────────────────
  console.log('\n5. Recent messages');
  if (number) {
    try {
      const inbound = await client.messages.list({ to: number, limit: 10 });
      if (inbound.length === 0) {
        bad('No inbound messages recorded on this number');
        problems.push(
          'Twilio has no record of receiving your texts — the number you texted is not this number, or it is not SMS-enabled on this account.'
        );
      } else {
        ok(`${inbound.length} inbound message(s) received — Twilio IS getting your texts`);
        for (const m of inbound.slice(0, 5)) {
          info(
            `← ${m.dateSent?.toISOString?.() ?? m.dateSent} from ${maskPhone(m.from)} [${m.status}] (content hidden)`
          );
        }
      }

      const outbound = await client.messages.list({ from: number, limit: 10 });
      if (outbound.length === 0) {
        bad('No outbound messages — the webhook never produced a reply');
        problems.push(
          'Twilio received texts but sent none back: the webhook returned an error (403 signature / 404 flag off / 500) or no TwiML. Check Vercel logs for twilio_webhook.signature_rejected and twilio_webhook.failed.'
        );
      } else {
        ok(`${outbound.length} outbound message(s) attempted`);
        for (const m of outbound.slice(0, 5)) {
          const failed = ['failed', 'undelivered'].includes(String(m.status));
          const line = `→ to ${maskPhone(m.to)}: [${m.status}]${m.errorCode ? ` error ${m.errorCode}: ${m.errorMessage || ''}` : ''}`;
          if (failed) bad(line.trim());
          else info(line.trim());
          if (m.errorCode === 30034) {
            problems.push(
              'Error 30034: outbound blocked because the number is not registered for A2P 10DLC. Complete brand + campaign registration.'
            );
          } else if (m.errorCode === 21610) {
            problems.push(
              `Error 21610: ${maskPhone(m.to)} has opted out (STOP). They must text START to receive replies again.`
            );
          } else if (m.errorCode === 30007) {
            problems.push(
              'Error 30007: carrier filtered the reply as spam — usually unregistered or mis-scoped A2P traffic.'
            );
          }
        }
      }
    } catch (error) {
      warn(`Could not read message logs: ${error.message}`);
      incompleteChecks.push('recent inbound/outbound message logs');
    }
  } else {
    incompleteChecks.push('recent inbound/outbound message logs');
  }

  printVerdict();
}

function printVerdict() {
  console.log('\n─────────────────────────────────────────────');
  if (problems.length === 0 && incompleteChecks.length === 0) {
    console.log('No problems found. The channel looks correctly wired.');
    console.log('If texting still fails, check the Vercel runtime logs for');
    console.log('twilio_webhook.* events at the moment you send a text.');
  } else {
    if (problems.length > 0) console.log(`${problems.length} problem(s) to fix:\n`);
    // Dedupe — one root cause often shows up on several messages.
    for (const [i, problem] of [...new Set(problems)].entries()) {
      console.log(`  ${i + 1}. ${problem}`);
    }
    if (incompleteChecks.length > 0) {
      console.log(
        `\nInconclusive — could not complete: ${[...new Set(incompleteChecks)].join(', ')}.`
      );
      process.exitCode = 2;
    }
  }
  console.log('');
}

main().catch((error) => {
  console.error('\nDiagnostics failed:', error.message);
  process.exit(1);
});
