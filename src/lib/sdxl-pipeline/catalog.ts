/**
 * SDXL/Illustrious LoRA catalog.
 *
 * Ported from tatt-pipeline-harness/lora-catalog.json (2026-05-26).
 *
 * - `lora_needed=false` means the Illustrious base model knows this character
 *   natively (url=null, default_strength=null).
 * - `lora_needed=true` with `url=null` means a Civitai LoRA was identified but
 *   still needs to be mirrored to R2 before production use.
 *
 * WARNING (from upstream catalog): several Civitai model IDs in the source
 * were hallucinated and not verified. Only `killua-zoldyck` (2105569) is
 * confirmed. Do not mirror unverified entries to R2 without a human check.
 */

export interface LoraCatalogEntry {
    /** R2 filename, when mirrored. Optional for native entries. */
    filename?: string;
    /** Direct .safetensors URL on R2 (or null if not yet mirrored / not needed). */
    url: string | null;
    /** True if a LoRA file is required; false means base model already knows the character. */
    lora_needed: boolean;
    /** Base model family the LoRA is trained against. */
    base: 'illustrious';
    /** Booru-tag trigger string to inject verbatim into the positive prompt. */
    trigger: string;
    /** Comma-separated booru tags to add to the negative prompt. */
    negative_hints: string;
    /** LoRA strength (model+clip). Null when lora_needed=false. */
    default_strength: number | null;
    /** Upstream Civitai page or note. */
    source: string;
    version?: string;
    size_mb?: number;
    todo?: string;
    notes?: string;
}

export interface LoraCatalogMeta {
    host: string;
    bucket: string;
    public_base: string;
    updated: string;
    schema_notes: string;
    WARNING_civitai_ids?: string;
}

export interface LoraCatalog {
    _meta: LoraCatalogMeta;
    loras: Record<string, LoraCatalogEntry>;
}

export const LORA_CATALOG: LoraCatalog = {
    _meta: {
        host: 'Cloudflare R2',
        bucket: 'tatt-loras',
        public_base: 'https://pub-8cc3f4a5f60d43f69a3bfc024849dfbe.r2.dev',
        updated: '2026-05-26',
        schema_notes:
            'lora_needed=false means the Illustrious base model knows this character natively; url=null with lora_needed=true means a Civitai LoRA was identified but still needs to be mirrored to R2.',
        WARNING_civitai_ids:
            '4 of 7 sampled Civitai IDs are wrong. Only killua-zoldyck (2105569) is verified.',
    },
    loras: {
        'killua-zoldyck': {
            filename: 'killua-illustrious.safetensors',
            url: 'https://pub-8cc3f4a5f60d43f69a3bfc024849dfbe.r2.dev/killua-illustrious.safetensors',
            lora_needed: true,
            base: 'illustrious',
            trigger: 'killua zoldyck, white hair, blue eyes',
            negative_hints: 'gon, hisoka',
            default_strength: 0.9,
            source: 'civitai.com/models/2105569',
            version: 'v1',
            size_mb: 435,
            notes: 'Killua from Hunter x Hunter. Use 0.9 strength for clean character match.',
        },
        goku: {
            url: null,
            lora_needed: false,
            base: 'illustrious',
            trigger:
                'son goku, dragon ball z, spiky black hair, black eyes, orange dougi, blue undershirt',
            negative_hints: 'vegeta, super saiyan blue, super saiyan, gohan',
            default_strength: null,
            source: 'native to illustrious base model',
            notes: "No LoRA needed; Illustrious knows base-form Goku well.",
        },
        vegeta: {
            url: null,
            lora_needed: false,
            base: 'illustrious',
            trigger:
                "vegeta, dragon ball z, spiky black hair, widow's peak, blue bodysuit, white gloves, white boots, saiyan armor",
            negative_hints: 'goku, trunks, super saiyan blue',
            default_strength: null,
            source: 'native to illustrious base model',
            notes: 'No LoRA needed.',
        },
        naruto: {
            url: null,
            lora_needed: true,
            base: 'illustrious',
            trigger:
                'uzumaki naruto, blonde hair, blue eyes, whisker marks, orange jumpsuit, forehead protector, konohagakure symbol',
            negative_hints: 'boruto, sasuke, minato',
            default_strength: 0.8,
            source: 'civitai.com/models/833294',
            todo: 'mirror to R2 before production use',
            notes: 'Shippuden-era Naruto.',
        },
        luffy: {
            url: null,
            lora_needed: true,
            base: 'illustrious',
            trigger:
                'monkey d. luffy, black hair, straw hat, red vest, scar under eye, blue shorts, sandals',
            negative_hints: 'zoro, ace, sabo',
            default_strength: 0.85,
            source: 'civitai.com/models/657897',
            todo: 'mirror to R2 before production use',
            notes: 'Post-timeskip Luffy.',
        },
        saitama: {
            url: null,
            lora_needed: true,
            base: 'illustrious',
            trigger:
                'saitama, one punch man, bald, blank eyes, yellow bodysuit, red gloves, red boots, white cape',
            negative_hints: 'genos, garou',
            default_strength: 0.85,
            source: 'civitai.com/models/445896',
            todo: 'mirror to R2 before production use',
            notes: 'Hero costume Saitama.',
        },
        'levi-ackerman': {
            url: null,
            lora_needed: true,
            base: 'illustrious',
            trigger:
                'levi ackerman, attack on titan, black hair, undercut, gray eyes, survey corps uniform, white ascot, green cloak, wings of freedom',
            negative_hints: 'eren, mikasa, erwin',
            default_strength: 0.85,
            source: 'civitai.com/models/389878',
            todo: 'mirror to R2 before production use',
            notes: 'Survey Corps Levi.',
        },
        tanjiro: {
            url: null,
            lora_needed: true,
            base: 'illustrious',
            trigger:
                'kamado tanjiro, demon slayer, red hair, burgundy eyes, forehead scar, hanafuda earrings, checkered haori, black demon slayer uniform',
            negative_hints: 'zenitsu, inosuke, nezuko, giyuu',
            default_strength: 0.85,
            source: 'civitai.com/models/388478',
            todo: 'mirror to R2 before production use',
            notes: 'Tanjiro Kamado.',
        },
        'gojo-satoru': {
            url: null,
            lora_needed: true,
            base: 'illustrious',
            trigger:
                'gojo satoru, jujutsu kaisen, white hair, blue eyes, blindfold, black jujutsu high uniform, high collar',
            negative_hints: 'geto, megumi, yuji',
            default_strength: 0.85,
            source: 'civitai.com/models/249267',
            todo: 'mirror to R2 before production use',
            notes: 'Blindfolded Gojo.',
        },
        ichigo: {
            url: null,
            lora_needed: true,
            base: 'illustrious',
            trigger:
                'kurosaki ichigo, bleach, orange hair, brown eyes, black shihakusho, zangetsu, large cleaver sword',
            negative_hints: 'rukia, renji, aizen',
            default_strength: 0.85,
            source: 'civitai.com/models/452897',
            todo: 'mirror to R2 before production use',
            notes: 'Shinigami Ichigo with Zangetsu.',
        },
    },
};

export function catalogSummary(catalog: LoraCatalog = LORA_CATALOG): string {
    const lines: string[] = [];
    for (const [key, entry] of Object.entries(catalog.loras)) {
        const loraNote = !entry.lora_needed
            ? 'NO LORA (native)'
            : `LoRA strength ${entry.default_strength}`;
        lines.push(
            `- key=${key} | trigger="${entry.trigger}" | ${loraNote} | avoid: ${entry.negative_hints}`
        );
    }
    return lines.join('\n');
}
