# 🚀 WHITE-LABEL MULTI-CLIENT DEPLOYMENT GUIDE (Option B)

This guide provides the complete, step-by-step instructions for creating, customizing, and deploying separate application instances and databases for different client companies.

---

## 📋 Architecture Overview

With **Option B (White-Label Multi-Client System)**:
- Each client company gets their own **customized application interface** (Branding, App Title, Themes, Module Features).
- Each client company gets their own **private Supabase Database project** (Complete data isolation).
- Each client gets their own **dedicated Vercel domain** (e.g., `acme-accounting.vercel.app` or `accounting.acmecorp.com`).

---

## 🛠️ Step 1: Set Up a New Client App locally

1. **Duplicate or Branch your project folder**:
   Create a copy of this repository for the new client company (e.g., `Accounting_AcmeCorp`).

2. **Configure Client Branding & Features**:
   Open `src/config/clientConfig.ts` in the new client folder and customize:

   ```typescript
   export const DEFAULT_CLIENT_CONFIG: ClientAppConfig = {
     branding: {
       clientName: "Acme Enterprise Solutions",  // Client Company Name
       shortCode: "ACME",
       appTitle: "Acme Financial Suite v1.0",      // Custom App Title
       themeColor: "#1e293b",
       accentColor: "#0f766e",
     },
     modules: {
       payrollEnabled: true,
       todayDeliveryEnabled: false,
       inventoryAccountingRulesEnabled: true,
       sqlConsoleEnabled: false,                 // Hide SQL console for standard clients
     },
   };
   ```

---

## 🗄️ Step 2: Create a Private Supabase Project for the Client

1. Log into your **[Supabase Dashboard](https://supabase.com/dashboard)**.
2. Click **New Project**.
   - **Name**: `Acme-Corp-Accounting-DB`
   - **Database Password**: Set a strong password.
   - **Region**: Choose the closest server region to the client.
3. Once the project is created:
   - Go to **Project Settings** ➔ **API**.
   - Copy the **Project URL** and **anon / public key**.
4. **Initialize Database Schema**:
   - Go to **SQL Editor** in your new Supabase dashboard.
   - Open `supabase_schema.sql` from your project folder.
   - Copy the entire SQL content, paste it into the Supabase SQL Editor, and click **Run**.

---

## 👤 Step 3: Create Client Accounts & Bind Authorized Device IPs

#### Method A: Using Terminal CLI Script (Fastest)
In your terminal, run:
```bash
node scripts/create_user.cjs client_user@acmecorp.com TempPassword123! 203.0.113.45
```
*(Replace `203.0.113.45` with the client's actual device IP address)*.

#### Method B: Via Supabase Dashboard
1. Go to **Authentication** ➔ **Users** ➔ **Add User** ➔ **Create User**.
2. Type Email and Password.
3. Open **SQL Editor** in Supabase and run:
   ```sql
   SELECT public.set_user_allowed_ip('client_user@acmecorp.com', '203.0.113.45');
   ```

---

## 🌐 Step 4: Deploy the Client App to Vercel

1. Open your terminal inside the client's project folder (`Accounting_AcmeCorp`).
2. Run the Vercel deployment command:
   ```bash
   npx vercel
   ```
3. Follow the CLI prompts:
   - **Set up and deploy?**: `y`
   - **Which scope?**: Choose your Vercel account.
   - **Link to existing project?**: `n` (Create a new project for this client)
   - **Project Name?**: `acme-accounting` (or client's preferred name)
   - **In which directory is your code located?**: `./` (Press Enter)
4. Deploy live to Production:
   ```bash
   npx vercel --prod
   ```
5. **Attach Custom Domain (Optional)**:
   - Go to your Vercel Dashboard ➔ Select `acme-accounting` ➔ **Settings** ➔ **Domains**.
   - Add the client's custom domain (e.g. `accounting.acmecorp.com`).

---

## 🔄 Step 5: Pushing Code Updates to Client Apps

When you update core accounting features or fix bugs in your template:
1. Run `npx vercel --prod` inside the client folder to update their live Vercel site instantly.
2. Each client's data, IP security, and database remain 100% private and untouched!
