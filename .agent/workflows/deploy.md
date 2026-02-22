---
description: How to deploy Praxis to Vercel and link praxi.live
---

// turbo-all
1. **GitHub Push**:
   - Run `git add .`
   - Run `git commit -m "Deployment Ready"`
   - Run `git push origin main`

2. **Vercel Setup**:
   - Go to [Vercel Dashboard](https://vercel.com/new).
   - Select the `fawazishola/praxis` repository.
   - **Environment Variables**: Add the following:
     - `GEMINI_API_KEY`: [Your Key]
     - `NEXT_PUBLIC_TESTNET_SEED`: [Your Seed]
     - `NEXT_PUBLIC_DESTINATION_ADDRESS`: [Your XRPL Address]
   - Click **Deploy**.

3. **Domain Linking**:
   - In Vercel, go to **Settings > Domains**.
   - Add `praxi.live`.
   - Update the A/CNAME records on **Name.com** as instructed by Vercel.
