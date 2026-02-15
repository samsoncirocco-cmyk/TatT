# Phase 3: Firestore + Cloud Storage - Research

**Researched:** 2026-02-15
**Domain:** Firestore data modeling, Cloud Storage integration, Cloud Tasks queuing, localStorage migration
**Confidence:** HIGH

## Summary

Phase 3 migrates user designs, version history, and preferences from localStorage/sessionStorage to Firestore, moves generated images to Cloud Storage with CDN delivery, and implements Cloud Tasks for async generation queuing. The research reveals critical architectural decisions around Firestore's 1MB document limit, which directly impacts layer storage strategies, and progressive migration patterns that allow anonymous users to continue using localStorage while authenticated users benefit from cloud persistence.

**Critical findings:**
- Firestore document size limit (1MiB) requires storing layers as references/subcollections, not embedded arrays
- Subcollections don't count toward parent document size—ideal for version history and layers
- Firestore transactions support optimistic concurrency for version branching/merging conflicts
- Cloud Storage objects with Cache-Control metadata act as CDN automatically (no extra setup needed)
- Cloud Tasks per-user concurrency limits require custom queue configuration per user (not global)
- Progressive migration requires storage abstraction layer to swap backends without changing hooks
- Current Zustand store uses sessionStorage—need custom Firestore persistence adapter

**Primary recommendation:** Use subcollections for versions (`users/{uid}/designs/{designId}/versions/{versionId}`) and layers (`versions/{versionId}/layers/{layerId}`). Implement storage abstraction service with localStorage/Firestore backends. Use Cloud Storage with `public-read` + 1-year `Cache-Control` for generated images. Create per-user Cloud Tasks queues with `maxConcurrentDispatches: 3`.

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| **Firebase JS SDK** | 12.8.0 | Client-side Firestore/Storage | Already in package.json, modular v9+ API, tree-shakeable |
| **firebase-admin** | 13.6.0 | Server-side Firestore/Storage | Already in package.json, server-side security, batch operations |
| **@google-cloud/tasks** | 5.x | Cloud Tasks client | Official GCP library for task queue management |
| **@google-cloud/storage** | 7.18.0 | Cloud Storage operations | Already in package.json, server-side upload/signed URLs |
| Zustand persist middleware | 5.0.10 | State persistence abstraction | Already in use, supports custom storage adapters |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| `firebase/firestore` | (from firebase 12.8.0) | Firestore client operations | Document CRUD, real-time listeners, transactions |
| `firebase/storage` | (from firebase 12.8.0) | Storage client uploads | Browser-side file uploads with progress tracking |
| `firebase-admin/firestore` | (from firebase-admin 13.6.0) | Server-side Firestore | Security rules bypass, batch writes, admin operations |
| `firebase-admin/storage` | (from firebase-admin 13.6.0) | Server-side Storage | Generate signed URLs, set metadata, CDN config |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Subcollections | Embedded arrays | Arrays hit 1MB limit with ~10-20 layers; subcollections scale to millions |
| Cloud Storage | Firestore blobs | Firestore max 1MB per document; images are 500KB-5MB each |
| Cloud Tasks | Pub/Sub | Pub/Sub lacks per-user concurrency control; Tasks support queue-level limits |
| Firestore | Cloud SQL | SQL requires schema migration pain; Firestore is schemaless, matches current data |
| Progressive migration | Hard cutover | Hard cutover loses anonymous user data; progressive preserves existing UX |

**Installation:**
```bash
# Cloud Tasks client library
npm install @google-cloud/tasks --save

# Already have firebase, firebase-admin, @google-cloud/storage
```

**Cloud Setup:**
```bash
# Enable required GCP services
gcloud services enable firestore.googleapis.com
gcloud services enable storage.googleapis.com
gcloud services enable cloudtasks.googleapis.com

# Create Firestore database (Native mode)
gcloud firestore databases create --location=us-central1

# Create Cloud Storage bucket with CDN
gcloud storage buckets create gs://tattester-generated-images \
  --location=us-central1 \
  --uniform-bucket-level-access

# Create Cloud Tasks queue
gcloud tasks queues create image-generation \
  --location=us-central1 \
  --max-concurrent-dispatches=100 \
  --max-dispatches-per-second=20
```

## Architecture Patterns

### Recommended Firestore Structure
```
users/
  {uid}/
    designs/
      {designId}/                    # Design document (metadata only)
        - createdAt: timestamp
        - updatedAt: timestamp
        - currentVersionId: string
        - bodyPart: string
        - canvas: { width, height, aspectRatio }
        - isFavorite: boolean

        versions/                    # Subcollection (doesn't count toward design doc size)
          {versionId}/               # Version document
            - versionNumber: number
            - timestamp: timestamp
            - prompt: string
            - enhancedPrompt: string
            - parameters: object
            - imageUrl: string (Cloud Storage URL)
            - branchedFrom: { sessionId?, versionId?, versionNumber? }
            - mergedFrom: { version1?, version2?, mergeOptions? }
            - isFavorite: boolean

            layers/                  # Subcollection (critical: prevents 1MB limit)
              {layerId}/             # Layer document
                - name: string
                - type: 'subject' | 'background' | 'effect'
                - imageUrl: string (Cloud Storage URL)
                - transform: { x, y, scaleX, scaleY, rotation }
                - blendMode: string
                - visible: boolean
                - zIndex: number

    preferences/                     # Subcollection
      settings/                      # Document
        - autoSaveEnabled: boolean
        - maxVersions: number
        - defaultBodyPart: string
```

**Why subcollections:**
- Firestore document limit: 1MiB including all nested data ([Firebase docs](https://firebase.google.com/docs/firestore/quotas))
- Layers array with 10 layers @ 100KB metadata each = 1MB (hits limit)
- Subcollections don't count toward parent document size ([Firebase data model](https://firebase.google.com/docs/firestore/data-model))
- Supports 100 levels deep, recommended max 3 ([Firestore best practices](https://firebase.google.com/docs/firestore/best-practices))
- Pagination: Load 20 versions per page using `limit(20)` and `startAfter()` ([Firestore query best practices](https://estuary.dev/blog/firestore-query-best-practices/))

### Pattern 1: Storage Abstraction Layer (Repository Pattern)

**What:** Interface-based storage service that swaps localStorage/Firestore backends without changing consumer code.

**When to use:** Always when multiple storage backends must coexist (authenticated vs anonymous users).

**Example:**
```typescript
// src/services/storage/IDesignStorage.ts
export interface IDesignStorage {
  saveDesign(userId: string, design: Design): Promise<void>;
  loadDesign(userId: string, designId: string): Promise<Design | null>;
  listDesigns(userId: string): Promise<DesignMetadata[]>;
  deleteDesign(userId: string, designId: string): Promise<void>;
}

// src/services/storage/LocalStorageAdapter.ts
export class LocalStorageAdapter implements IDesignStorage {
  async saveDesign(userId: string, design: Design): Promise<void> {
    const key = `design_${userId}_${design.id}`;
    localStorage.setItem(key, JSON.stringify(design));
  }
  // ... other methods
}

// src/services/storage/FirestoreAdapter.ts
import { doc, setDoc, getDoc, collection, query, getDocs, deleteDoc } from 'firebase/firestore';

export class FirestoreAdapter implements IDesignStorage {
  constructor(private db: Firestore) {}

  async saveDesign(userId: string, design: Design): Promise<void> {
    const designRef = doc(this.db, `users/${userId}/designs/${design.id}`);
    await setDoc(designRef, {
      createdAt: design.createdAt,
      updatedAt: new Date(),
      currentVersionId: design.currentVersionId,
      bodyPart: design.bodyPart,
      canvas: design.canvas,
      isFavorite: design.isFavorite
    });

    // Save versions as subcollection
    for (const version of design.versions) {
      const versionRef = doc(this.db, `users/${userId}/designs/${design.id}/versions/${version.id}`);
      await setDoc(versionRef, version);

      // Save layers as nested subcollection
      for (const layer of version.layers) {
        const layerRef = doc(this.db, `users/${userId}/designs/${design.id}/versions/${version.id}/layers/${layer.id}`);
        await setDoc(layerRef, layer);
      }
    }
  }
  // ... other methods
}

// src/services/storage/StorageFactory.ts
export function createStorageAdapter(user: User | null): IDesignStorage {
  if (user) {
    // Authenticated: use Firestore
    return new FirestoreAdapter(db);
  } else {
    // Anonymous: use localStorage
    return new LocalStorageAdapter();
  }
}
```

**Source:** Repository pattern for Firestore abstraction ([Medium: Firestore Repositories](https://medium.com/@dominicbartl/firestore-on-node-in-production-part-1-repositories-c16178a9b247))

### Pattern 2: Version Branching with Firestore Transactions

**What:** Use Firestore transactions to handle concurrent version branching/merging with optimistic concurrency control.

**When to use:** When creating branches or merging versions where conflicts are possible.

**Example:**
```typescript
import { runTransaction, doc } from 'firebase/firestore';

async function branchFromVersion(
  userId: string,
  designId: string,
  sourceVersionId: string
): Promise<{ newDesignId: string; newVersionId: string }> {
  const newDesignId = generateId();
  const newVersionId = generateId();

  return runTransaction(db, async (transaction) => {
    // Read source version
    const sourceVersionRef = doc(db, `users/${userId}/designs/${designId}/versions/${sourceVersionId}`);
    const sourceVersionSnap = await transaction.get(sourceVersionRef);

    if (!sourceVersionSnap.exists()) {
      throw new Error('Source version not found');
    }

    const sourceVersion = sourceVersionSnap.data();

    // Create new design document
    const newDesignRef = doc(db, `users/${userId}/designs/${newDesignId}`);
    transaction.set(newDesignRef, {
      createdAt: new Date(),
      updatedAt: new Date(),
      currentVersionId: newVersionId,
      bodyPart: sourceVersion.bodyPart,
      canvas: sourceVersion.canvas,
      isFavorite: false
    });

    // Create new version as branch
    const newVersionRef = doc(db, `users/${userId}/designs/${newDesignId}/versions/${newVersionId}`);
    transaction.set(newVersionRef, {
      ...sourceVersion,
      id: newVersionId,
      versionNumber: 1,
      timestamp: new Date(),
      branchedFrom: {
        designId,
        versionId: sourceVersionId,
        versionNumber: sourceVersion.versionNumber
      }
    });

    // Copy layers (read source, write to new location)
    // Note: Transactions have 500 operation limit, batch large layer sets

    return { newDesignId, newVersionId };
  });
}
```

**Why transactions:**
- Firestore retries transactions on concurrent modification automatically ([Firebase transactions docs](https://firebase.google.com/docs/firestore/manage-data/transactions))
- Optimistic concurrency: no locks, retries entire transaction on conflict ([Transaction serializability](https://firebase.google.com/docs/firestore/transaction-data-contention))
- Mobile/web SDKs use write preconditions on document versions ([Bootstrapped Firebase: write conflicts](https://bootstrapped.app/guide/how-to-handle-firebase-firestore-write-conflicts))

### Pattern 3: Progressive Migration with Anonymous User Upgrade

**What:** Anonymous users use localStorage; upon authentication, migrate their data to Firestore without data loss.

**When to use:** When transitioning from client-side to cloud storage without breaking anonymous user experience.

**Example:**
```typescript
// src/services/migration/migrateAnonymousData.ts
import { signInAnonymously, linkWithCredential, EmailAuthProvider } from 'firebase/auth';

async function migrateAnonymousToAuthenticated(
  email: string,
  password: string
): Promise<void> {
  // Step 1: Sign in anonymously with existing data
  const anonUser = await signInAnonymously(auth);

  // Step 2: Load localStorage data
  const localDesigns = loadDesignsFromLocalStorage();

  // Step 3: Upload to Firestore under anonymous UID
  const storage = new FirestoreAdapter(db);
  for (const design of localDesigns) {
    await storage.saveDesign(anonUser.uid, design);
  }

  // Step 4: Link anonymous account to email/password (upgrades account, preserves UID)
  const credential = EmailAuthProvider.credential(email, password);
  await linkWithCredential(anonUser, credential);

  // Step 5: Clear localStorage (data now in Firestore)
  clearLocalStorageDesigns();

  // UID remains the same, so Firestore paths stay valid
}
```

**Why this pattern:**
- Firebase Auth `linkWithCredential` preserves UID when upgrading anonymous to permanent ([Firebase anonymous auth best practices](https://firebase.blog/posts/2023/07/best-practices-for-anonymous-authentication/))
- UID as Firestore path key means no data migration needed after upgrade
- Resilient: migrate data BEFORE linking credentials to avoid data loss on failure ([HackerNoon: localStorage to Firestore](https://hackernoon.com/how-to-implement-localstorage-or-firebase-firestore-into-your-js-project-jiu3u84))

### Pattern 4: Cloud Storage Upload with CDN-Ready Metadata

**What:** Upload generated images to Cloud Storage with `Cache-Control` metadata for automatic CDN behavior.

**When to use:** When serving user-generated images that don't change (immutable assets).

**Example:**
```typescript
// src/services/storage/imageStorageService.ts
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';

async function uploadGeneratedImage(
  userId: string,
  designId: string,
  versionId: string,
  imageBlob: Blob
): Promise<string> {
  const storage = getStorage();
  const fileName = `${userId}/${designId}/${versionId}/generated.png`;
  const storageRef = ref(storage, fileName);

  // Upload with metadata for CDN caching
  const metadata = {
    contentType: 'image/png',
    cacheControl: 'public, max-age=31536000, immutable', // 1 year cache
    customMetadata: {
      userId,
      designId,
      versionId,
      uploadedAt: new Date().toISOString()
    }
  };

  const uploadResult = await uploadBytes(storageRef, imageBlob, metadata);
  const downloadURL = await getDownloadURL(uploadResult.ref);

  // downloadURL includes Firebase token for security
  return downloadURL;
}
```

**Why this works:**
- Cloud Storage with `Cache-Control` acts as CDN automatically ([GCP Cloud Storage caching](https://docs.cloud.google.com/storage/docs/caching))
- `public, max-age=31536000, immutable` means browsers/CDN cache for 1 year ([Firebase Cloud Storage CDN](https://www.bacancytechnology.com/qanda/cloud/implement-cdn-with-firebase-storage))
- For enhanced performance, Cloud CDN can be added via Application Load Balancer ([Firebase Storage CDN integration](https://medium.com/@sehban.alam/optimizing-firebase-cloud-storage-for-media-heavy-applications-2456a7d11bad))

**Security rules:**
```javascript
rules_version = '2';
service firebase.storage {
  match /b/{bucket}/o {
    // User-generated images (read by anyone, write by owner)
    match /{userId}/{designId}/{versionId}/{fileName} {
      allow read: if true; // Public read for sharing
      allow write: if request.auth != null && request.auth.uid == userId;
    }
  }
}
```

**Source:** Firebase Cloud Storage security rules ([Firebase Storage security](https://firebase.google.com/docs/storage))

### Pattern 5: Cloud Tasks Per-User Concurrency Limits

**What:** Create per-user task queues to enforce "max 3 concurrent generations per user" requirement.

**When to use:** When rate limiting needs to be per-user, not global.

**Example:**
```typescript
// src/services/tasks/generationQueue.ts
import { CloudTasksClient } from '@google-cloud/tasks';

const tasksClient = new CloudTasksClient();

async function enqueueGenerationTask(
  userId: string,
  prompt: string,
  parameters: object
): Promise<string> {
  // Per-user queue naming pattern
  const queueName = `generation-${userId.substring(0, 8)}`;
  const parent = tasksClient.queuePath(
    process.env.GCP_PROJECT_ID,
    process.env.GCP_LOCATION,
    queueName
  );

  // Ensure queue exists with per-user limits
  await ensureQueueExists(queueName, {
    maxConcurrentDispatches: 3,  // Max 3 concurrent per user
    maxDispatchesPerSecond: 0.5  // Max 1 every 2 seconds
  });

  // Create task
  const task = {
    httpRequest: {
      httpMethod: 'POST',
      url: `${process.env.CLOUD_RUN_URL}/api/v1/tasks/generate`,
      headers: {
        'Content-Type': 'application/json',
      },
      body: Buffer.from(JSON.stringify({ userId, prompt, parameters })).toString('base64'),
      oidcToken: {
        serviceAccountEmail: process.env.TASK_SERVICE_ACCOUNT
      }
    }
  };

  const [response] = await tasksClient.createTask({ parent, task });
  return response.name;
}

async function ensureQueueExists(queueName: string, rateLimits: object): Promise<void> {
  const queuePath = tasksClient.queuePath(
    process.env.GCP_PROJECT_ID,
    process.env.GCP_LOCATION,
    queueName
  );

  try {
    await tasksClient.getQueue({ name: queuePath });
  } catch (error) {
    if (error.code === 5) { // NOT_FOUND
      const parent = tasksClient.locationPath(
        process.env.GCP_PROJECT_ID,
        process.env.GCP_LOCATION
      );

      await tasksClient.createQueue({
        parent,
        queue: {
          name: queuePath,
          rateLimits: {
            maxConcurrentDispatches: rateLimits.maxConcurrentDispatches,
            maxDispatchesPerSecond: rateLimits.maxDispatchesPerSecond
          }
        }
      });
    } else {
      throw error;
    }
  }
}
```

**Why per-user queues:**
- API Gateway quotas are per-project, not per-user ([Cloud Tasks rate limits](https://cloud.google.com/tasks/docs/configuring-queues))
- `maxConcurrentDispatches` at queue level limits concurrent tasks ([Cloud Tasks concurrency config](https://cloud.google.com/tasks/docs/reference/rest/v2/projects))
- Creating queue per user (or user hash bucket) isolates limits ([Cloud Tasks update queue](https://cloud.google.com/tasks/docs/samples/cloud-tasks-taskqueues-processing-rate))

### Pattern 6: Zustand Firestore Persistence Adapter

**What:** Custom Zustand storage adapter that syncs layer state to Firestore instead of sessionStorage.

**When to use:** When migrating existing Zustand-based state to cloud persistence.

**Example:**
```typescript
// src/stores/firestoreStorage.ts
import { doc, getDoc, setDoc, onSnapshot } from 'firebase/firestore';
import type { StateStorage } from 'zustand/middleware';

export function createFirestoreStorage(
  userId: string,
  designId: string
): StateStorage {
  const docRef = doc(db, `users/${userId}/designs/${designId}`);

  return {
    getItem: async (name: string): Promise<string | null> => {
      try {
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
          const data = docSnap.data();
          return JSON.stringify(data.state || {});
        }
        return null;
      } catch (error) {
        console.error('Firestore getItem error:', error);
        return null;
      }
    },

    setItem: async (name: string, value: string): Promise<void> => {
      try {
        const state = JSON.parse(value);
        await setDoc(docRef, {
          state,
          updatedAt: new Date()
        }, { merge: true });
      } catch (error) {
        console.error('Firestore setItem error:', error);
      }
    },

    removeItem: async (name: string): Promise<void> => {
      try {
        await setDoc(docRef, {
          state: null,
          updatedAt: new Date()
        }, { merge: true });
      } catch (error) {
        console.error('Firestore removeItem error:', error);
      }
    }
  };
}

// Usage in useForgeStore.ts
import { createFirestoreStorage } from './firestoreStorage';

export const useForgeStore = create<ForgeState>()(
  persist(baseStore, {
    name: STORAGE_KEY,
    storage: createJSONStorage(() => {
      const user = getCurrentUser(); // From AuthContext
      const designId = getDesignId(); // From URL or session

      if (user && designId) {
        return createFirestoreStorage(user.uid, designId);
      } else {
        return window.sessionStorage; // Fallback for anonymous
      }
    }),
    partialize: (state) => ({
      layers: state.layers.map(({ thumbnail, ...layer }) => layer),
      selectedLayerId: state.selectedLayerId
    })
  })
);
```

**Source:** Zustand persist middleware custom storage ([Zustand persist docs](https://zustand.docs.pmnd.rs/middlewares/persist))

### Anti-Patterns to Avoid

**1. Embedding large arrays in documents**
- **Why it's bad:** Hits 1MB limit with ~10-20 layers, breaks version history growth
- **What to do instead:** Use subcollections for versions and layers ([Firestore document limits](https://firebase.google.com/docs/firestore/quotas))

**2. Deleting parent documents without cascade**
- **Why it's bad:** Firestore doesn't auto-delete subcollections when parent is deleted ([Firestore data model](https://firebase.google.com/docs/firestore/data-model))
- **What to do instead:** Recursive delete function or Cloud Functions trigger

**3. Client-side batch writes for version merging**
- **Why it's bad:** No atomicity guarantee, partial writes on failure
- **What to do instead:** Use transactions for multi-document operations ([Firestore transactions](https://firebase.google.com/docs/firestore/manage-data/transactions))

**4. Storing image blobs in Firestore**
- **Why it's bad:** 1MB document limit, no CDN support, inefficient
- **What to do instead:** Cloud Storage with download URLs stored in Firestore

**5. Hard localStorage cutover**
- **Why it's bad:** Anonymous users lose all data, bad UX
- **What to do instead:** Progressive migration with anonymous upgrade path

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Firestore pagination | Manual offset tracking | `startAfter()` + `limit()` cursors | Firestore doesn't support SQL-style OFFSET, cursors are efficient ([Firestore query best practices](https://estuary.dev/blog/firestore-query-best-practices/)) |
| Image CDN | Custom CDN proxy | Cloud Storage `Cache-Control` metadata | Cloud Storage acts as CDN automatically, no extra infrastructure ([Cloud Storage caching](https://docs.cloud.google.com/storage/docs/caching)) |
| Concurrent task limiting | Manual semaphore tracking | Cloud Tasks `maxConcurrentDispatches` | Built-in queue-level concurrency control, handles failures/retries ([Cloud Tasks rate limits](https://cloud.google.com/tasks/docs/configuring-queues)) |
| Transaction retry logic | Custom retry loops | Firestore `runTransaction()` | Automatic retry on contention, handles version conflicts ([Firestore transactions](https://firebase.google.com/docs/firestore/manage-data/transactions)) |
| Storage abstraction | Custom if/else branching | Repository pattern interface | Swappable backends, testable, type-safe ([Firestore repository pattern](https://medium.com/@dominicbartl/firestore-on-node-in-production-part-1-repositories-c16178a9b247)) |

**Key insight:** Firestore and Cloud Storage are designed for specific access patterns. Fighting those patterns (e.g., embedding large arrays, manual pagination) creates complexity and bugs. Lean into subcollections, cursors, and metadata-driven caching.

## Common Pitfalls

### Pitfall 1: Version History Hitting 1MB Limit

**What goes wrong:** Storing all versions in a single document's `versions` array hits 1MB limit after 10-50 versions depending on layer complexity.

**Why it happens:** Developer assumes Firestore works like MongoDB with large document support. Firestore has strict 1MiB limit per document.

**How to avoid:**
- Use subcollections for versions: `designs/{id}/versions/{versionId}`
- Each version is its own document
- Parent design document only stores metadata (createdAt, currentVersionId)
- Subcollections don't count toward parent size ([Firebase Firestore data model](https://firebase.google.com/docs/firestore/data-model))

**Warning signs:**
- Error: "Document size exceeds 1 MiB"
- Version save operations fail silently
- Unable to create new versions after ~10-20 iterations

### Pitfall 2: Concurrent Version Branching Race Conditions

**What goes wrong:** Two users branch from the same version simultaneously, creating duplicate branch version numbers (both version 1 in different designs).

**Why it happens:** Without transactions, read-then-write operations aren't atomic. Version number assignment races.

**How to avoid:**
- Wrap branch operation in Firestore transaction
- Transaction reads source version and writes new branch atomically
- If concurrent write detected, Firestore retries entire transaction ([Firestore transaction serializability](https://firebase.google.com/docs/firestore/transaction-data-contention))

**Warning signs:**
- Duplicate version numbers in different branches
- Version numbers skip (1, 2, 4, 7... missing 3, 5, 6)
- Branch creation fails intermittently under load

### Pitfall 3: Anonymous User Data Loss on Authentication

**What goes wrong:** User creates designs anonymously in localStorage, signs up, localStorage not migrated → data appears lost.

**Why it happens:** No migration logic between anonymous localStorage and authenticated Firestore.

**How to avoid:**
- Use Firebase Anonymous Auth to create UID before permanent signup
- Store data in Firestore under anonymous UID
- Use `linkWithCredential` to upgrade anonymous to permanent (preserves UID)
- UID stays same, so Firestore paths don't change ([Firebase anonymous auth best practices](https://firebase.blog/posts/2023/07/best-practices-for-anonymous-authentication/))

**Warning signs:**
- User reports "all my designs disappeared after signing up"
- localStorage has data but Firestore is empty for authenticated user
- Different UIDs for same user pre/post authentication

### Pitfall 4: Cloud Storage URLs Expiring

**What goes wrong:** Design loads, image URLs return 403 Forbidden after some time.

**Why it happens:** Using signed URLs with expiration instead of permanent download URLs.

**How to avoid:**
- Use `getDownloadURL()` for permanent public URLs (includes Firebase token)
- Set security rules to allow public read for user-generated images
- Don't use signed URLs unless temporary access needed
- Signed URLs expire; download URLs with Firebase tokens don't ([Firebase Cloud Storage download URLs](https://firebase.google.com/docs/storage))

**Warning signs:**
- Images load initially but 403 after hours/days
- URLs contain `&Expires=` parameter
- Re-fetching URL works temporarily then fails again

### Pitfall 5: Firestore Read Costs Explosion

**What goes wrong:** Loading design with 50 versions + 20 layers each = 1,000+ document reads per load. Costs spike.

**Why it happens:** No pagination, eager loading all subcollections.

**How to avoid:**
- Paginate versions: Load latest 10, fetch more on scroll
- Lazy load layers: Load version metadata first, layers on demand
- Use Firestore listeners sparingly (real-time listeners = ongoing reads)
- Denormalize frequently accessed data (current version in parent doc)

**Warning signs:**
- Firestore bill shows 100K+ reads for small user base
- Design load takes 3-5 seconds due to read volume
- Network tab shows hundreds of Firestore requests per page load

### Pitfall 6: Cloud Tasks Queue Explosion (One Queue Per User)

**What goes wrong:** Creating literal queue per user hits GCP quota limits (1,000 queues per project).

**Why it happens:** Misunderstanding "per-user limits" as "separate queue per user."

**How to avoid:**
- Use queue sharding: Hash user ID to 10-20 buckets, create queue per bucket
- Example: `queue-${hashUserId(uid) % 20}` creates 20 queues total
- Each queue has `maxConcurrentDispatches: 3`, but multiple users share queue
- Track per-user concurrency in Firestore separately if needed

**Warning signs:**
- Error: "Quota exceeded for quota metric 'Queue count'"
- Queue creation fails for new users
- GCP console shows thousands of queues

## Code Examples

### Example 1: Load Design with Pagination

```typescript
// src/services/firestore/designService.ts
import { collection, doc, getDoc, query, orderBy, limit, getDocs } from 'firebase/firestore';

async function loadDesignWithVersions(
  userId: string,
  designId: string,
  versionLimit: number = 10
): Promise<Design> {
  // Load design metadata
  const designRef = doc(db, `users/${userId}/designs/${designId}`);
  const designSnap = await getDoc(designRef);

  if (!designSnap.exists()) {
    throw new Error('Design not found');
  }

  const designData = designSnap.data();

  // Load latest N versions (paginated)
  const versionsRef = collection(db, `users/${userId}/designs/${designId}/versions`);
  const versionsQuery = query(
    versionsRef,
    orderBy('versionNumber', 'desc'),
    limit(versionLimit)
  );

  const versionsSnap = await getDocs(versionsQuery);
  const versions = versionsSnap.docs.map(doc => ({
    id: doc.id,
    ...doc.data()
  }));

  return {
    id: designId,
    ...designData,
    versions
  };
}
```

### Example 2: Recursive Delete with Subcollections

```typescript
// src/services/firestore/deleteService.ts
import { doc, deleteDoc, collection, getDocs, writeBatch } from 'firebase/firestore';

async function deleteDesignCascade(userId: string, designId: string): Promise<void> {
  const batch = writeBatch(db);

  // Delete all versions and their layers
  const versionsRef = collection(db, `users/${userId}/designs/${designId}/versions`);
  const versionsSnap = await getDocs(versionsRef);

  for (const versionDoc of versionsSnap.docs) {
    const versionId = versionDoc.id;

    // Delete all layers in this version
    const layersRef = collection(db, `users/${userId}/designs/${designId}/versions/${versionId}/layers`);
    const layersSnap = await getDocs(layersRef);

    layersSnap.docs.forEach(layerDoc => {
      batch.delete(layerDoc.ref);
    });

    // Delete version
    batch.delete(versionDoc.ref);
  }

  // Delete design document
  const designRef = doc(db, `users/${userId}/designs/${designId}`);
  batch.delete(designRef);

  await batch.commit();
}
```

### Example 3: Real-Time Layer Sync with Firestore Listener

```typescript
// src/hooks/useFirestoreLayerSync.ts
import { collection, query, onSnapshot } from 'firebase/firestore';
import { useEffect } from 'react';

function useFirestoreLayerSync(
  userId: string,
  designId: string,
  versionId: string,
  onLayersUpdate: (layers: Layer[]) => void
) {
  useEffect(() => {
    if (!userId || !designId || !versionId) return;

    const layersRef = collection(
      db,
      `users/${userId}/designs/${designId}/versions/${versionId}/layers`
    );
    const layersQuery = query(layersRef, orderBy('zIndex', 'asc'));

    const unsubscribe = onSnapshot(layersQuery, (snapshot) => {
      const layers = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as Layer[];

      onLayersUpdate(layers);
    });

    return () => unsubscribe();
  }, [userId, designId, versionId]);
}
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Embedded arrays | Subcollections | Always (Firestore limit) | Scales to unlimited versions/layers |
| localStorage only | Progressive Firestore | 2024+ (auth integration) | Cross-device persistence |
| Signed URLs | Download URLs | Firebase 9+ | No expiration, permanent access |
| Manual pagination | Firestore cursors | Firestore launch (2017) | Efficient large dataset handling |
| Global rate limiting | Per-user Cloud Tasks | Cloud Tasks v2 (2020+) | Fair resource allocation |

**Deprecated/outdated:**
- **Firestore in Datastore mode:** Use Native mode for new projects (better features, mobile SDKs)
- **Firebase Realtime Database for structured data:** Use Firestore for hierarchical documents
- **Client-side only authentication:** Use Firebase Auth with server-side verification (security)

## Open Questions

### Question 1: Maximum Versions Per Design

**What we know:** Firestore supports unlimited subcollections, but UI/UX may need practical limits.

**What's unclear:** Should we enforce max 50 versions per design (current localStorage limit) or allow unlimited?

**Recommendation:**
- Keep 50-version UI limit for initial release
- Implement "archive old versions" feature (move to `archived_versions` subcollection)
- Monitor actual usage patterns in analytics before increasing limit

### Question 2: Real-Time Collaboration (Out of Scope?)

**What we know:** Firestore supports real-time listeners (`onSnapshot`), enabling live updates.

**What's unclear:** Phase 3 scope says "persist designs," not "real-time collaboration." Should we build for future collab?

**Recommendation:**
- Phase 3: Build data model to support collaboration (user-owned designs, not session-owned)
- Don't implement real-time UI updates in Phase 3
- Phase N (future): Add `onSnapshot` listeners and presence tracking

### Question 3: Image Storage Bucket Security

**What we know:** Images need to be publicly readable for sharing, but write-protected.

**What's unclear:** Should generated images be in a public bucket or user-scoped bucket with public read rules?

**Recommendation:**
- Use single bucket with hierarchical paths: `{userId}/{designId}/{versionId}/generated.png`
- Security rules: Public read, authenticated write only to own path
- Prevents other users from overwriting images, but allows sharing

### Question 4: Cloud Tasks vs. Pub/Sub for Generation Queue

**What we know:** Cloud Tasks supports per-queue concurrency limits; Pub/Sub does not.

**What's unclear:** Is the added complexity of managing queues worth it vs. simpler Pub/Sub?

**Recommendation:**
- Use Cloud Tasks for Phase 3 (requirement: "max 3 concurrent per user")
- If per-user limits prove unnecessary, migrate to Pub/Sub in Phase N
- Tasks also provide better retry/failure handling for long-running operations

## Sources

### Primary (HIGH confidence)
- [Firebase Firestore Documentation](https://firebase.google.com/docs/firestore) - Official Firebase docs (checked 2026-02-15)
- [Cloud Storage for Firebase](https://firebase.google.com/docs/storage) - Official Firebase Storage docs
- [Cloud Tasks Documentation](https://cloud.google.com/tasks/docs) - Official GCP Cloud Tasks docs
- [Firestore Quotas and Limits](https://firebase.google.com/docs/firestore/quotas) - Document size limits (1MB confirmed)
- [Firestore Transactions](https://firebase.google.com/docs/firestore/manage-data/transactions) - Transaction patterns
- Context7 Firebase library (/websites/firebase_google) - Code examples and patterns

### Secondary (MEDIUM confidence)
- [Firestore Query Best Practices for 2026](https://estuary.dev/blog/firestore-query-best-practices/) - Pagination, indexing
- [Best Practices for Anonymous Authentication](https://firebase.blog/posts/2023/07/best-practices-for-anonymous-authentication/) - Migration patterns
- [Firestore Repository Pattern](https://medium.com/@dominicbartl/firestore-on-node-in-production-part-1-repositories-c16178a9b247) - Abstraction layer design
- [Cloud Storage Caching Documentation](https://docs.cloud.google.com/storage/docs/caching) - CDN behavior
- [Zustand Persist Middleware](https://zustand.docs.pmnd.rs/middlewares/persist) - Custom storage adapters

### Tertiary (LOW confidence)
- [HackerNoon: localStorage to Firestore](https://hackernoon.com/how-to-implement-localstorage-or-firebase-firestore-into-your-js-project-jiu3u84) - Migration patterns (community)
- [Firestore Limitations](https://estuary.dev/blog/firestore-limitations/) - Practical workarounds (community)
- [Firebase Storage CDN Implementation](https://www.bacancytechnology.com/qanda/cloud/implement-cdn-with-firebase-storage) - CDN setup (community)

## Metadata

**Confidence breakdown:**
- Firestore data modeling: HIGH - Official Firebase docs, Context7 code examples, verified 1MB limit
- Cloud Storage CDN: HIGH - Official GCP docs on cache-control metadata, verified behavior
- Cloud Tasks per-user limits: MEDIUM - Official API docs, but per-user queue pattern is custom implementation
- Progressive migration: MEDIUM - Firebase best practices blog, community patterns, no official guide
- Zustand Firestore adapter: MEDIUM - Zustand docs on custom storage, no official Firestore example

**Research date:** 2026-02-15
**Valid until:** ~60 days (March 2026) - Firebase/GCP APIs are stable, but best practices evolve

**Critical items for planning:**
1. Firestore subcollection structure (versions → layers) is non-negotiable due to 1MB limit
2. Storage abstraction layer required for progressive migration (anonymous fallback)
3. Cloud Tasks per-user queues need queue sharding strategy (hash user ID to buckets)
4. Transaction pattern for version branching prevents race conditions
5. Cloud Storage Cache-Control metadata enables CDN without extra infrastructure
