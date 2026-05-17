# Market backend setup (Firebase)

The Market is a real, cross-device feature backed by Firebase
Anonymous Auth + Firestore. It will not work until you create a
Firebase project and paste its config into `src/firebase-config.js`.

The Firebase free tier ("Spark") is plenty for this game.

## 1. Create the Firebase project

1. Go to https://console.firebase.google.com and click **Add project**.
2. Name it (e.g. `plant-cards`). You can disable Google Analytics — it
   isn't needed.
3. Once created, click the **web** icon (`</>`) on the project home page
   to register a web app. Pick any nickname; **do not** enable Firebase
   Hosting.
4. Firebase will show you a `firebaseConfig` object. Copy those keys.

## 2. Paste the config

Open `src/firebase-config.js` and replace the placeholder fields with
the values you just copied. The whole object should look like:

```js
export const firebaseConfig = {
  apiKey: 'AIzaSy…',
  authDomain: 'plant-cards.firebaseapp.com',
  projectId: 'plant-cards',
  storageBucket: 'plant-cards.appspot.com',
  messagingSenderId: '1234567890',
  appId: '1:1234567890:web:abc123…',
};
```

These keys are **not** secrets — they only identify your project. Security
is enforced by the Firestore rules below.

## 3. Enable Anonymous Auth

In the Firebase console:

1. **Build → Authentication → Get started**.
2. Open the **Sign-in method** tab.
3. Enable **Anonymous** and save.

## 4. Create Firestore

1. **Build → Firestore Database → Create database**.
2. Pick a location near you.
3. Start in **production mode**.
4. After it provisions, open the **Rules** tab and paste:

```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {

    // Anyone signed in can read profiles. Only the owner can write theirs.
    match /users/{uid} {
      allow read: if request.auth != null;
      allow write: if request.auth != null && request.auth.uid == uid;
    }

    // Listings: anyone signed in can browse. Sellers create their own.
    // Anyone signed in can delete a listing (so a buyer can claim it).
    match /listings/{id} {
      allow read: if request.auth != null;
      allow create: if request.auth != null
                    && request.resource.data.sellerUid == request.auth.uid
                    && request.resource.data.price is int
                    && request.resource.data.price > 0
                    && request.resource.data.price <= 999999;
      allow delete: if request.auth != null;
      allow update: if false;
    }

    // pendingSales: any signed-in user can create one (as a buyer crediting
    // the seller). The recipient is the only one allowed to read or delete.
    match /pendingSales/{id} {
      allow create: if request.auth != null
                    && request.resource.data.buyerUid == request.auth.uid
                    && request.resource.data.forUid is string
                    && request.resource.data.price is int
                    && request.resource.data.price > 0;
      allow read, delete: if request.auth != null
                          && resource.data.forUid == request.auth.uid;
      allow update: if false;
    }
  }
}
```

Click **Publish**.

## 5. Authorize your domain

In **Authentication → Settings → Authorized domains**, make sure your
GitHub Pages domain (e.g. `vectorless.github.io`) is listed.
`localhost` is already authorized for development.

## 6. Run it

```
npm run dev
```

Open the Market tab. You should be asked to pick a display name.
Post a card; open the same site on another device or browser and it
should appear under "Browse". Cancel returns the card to your
collection. Buying transfers the card to the buyer and credits the
seller's coins the next time they open the Market.

## Trust model (read me)

Coins live in `localStorage`, so the game already trusts each client.
The Market follows the same model:

- When you buy a card, your client deducts your own coins and writes a
  `pendingSale` doc for the seller. The seller's client redeems that
  doc into coins on their side.
- A determined attacker could refuse to credit the seller — but that
  same attacker could already type any number of coins into their own
  storage, so this isn't a new hole.

If you ever want to tighten this, the upgrade path is Firestore Cloud
Functions enforcing the buy/credit flow server-side. That's out of
scope for now.
