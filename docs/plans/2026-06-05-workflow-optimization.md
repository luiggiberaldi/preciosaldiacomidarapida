# Optimización del Flujo de Trabajo (Workflow E2E) Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Implement real-time table sync via Supabase Realtime, automated kitchen alerts and despacho messaging via Cloudflare Worker/SSE webhooks, and a resilient, offline-first print queue in IndexedDB.

**Architecture:** We will create a database table for active tabs (`pos_active_tabs`) and synchronize it reactively on all terminals using Supabase Realtime channels. We will update the kitchen stream to handle local webhooks and automate WhatsApp messaging. Finally, we will build a local print queue scheduler in the client printer hook.

**Tech Stack:** React, Supabase, Cloudflare Workers, IndexedDB (localforage), Web Serial API.

---

### Task 1: Supabase Database Migration for Active Tabs

**Files:**
- Create: `supabase_migration/create_pos_active_tabs.sql`
- Test: `test_workflow_variants.js`

**Step 1: Write the SQL migration**
Create the file `supabase_migration/create_pos_active_tabs.sql` with the following content:
```sql
CREATE TABLE IF NOT EXISTS public.pos_active_tabs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    table_id TEXT NOT NULL,
    name TEXT NOT NULL,
    items JSONB NOT NULL DEFAULT '[]'::jsonb,
    status TEXT NOT NULL DEFAULT 'ACTIVE',
    customer_info JSONB NOT NULL DEFAULT '{}'::jsonb,
    updated_at TIMESTAMPTZ DEFAULT now(),
    created_at TIMESTAMPTZ DEFAULT now(),
    CONSTRAINT uq_pos_active_tabs UNIQUE (user_id, table_id)
);

ALTER TABLE public.pos_active_tabs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Tenant manages own active tabs"
    ON public.pos_active_tabs FOR ALL TO authenticated
    USING (user_id = auth.uid())
    WITH CHECK (user_id = auth.uid());
```

**Step 2: Apply migration to Supabase database**
Verify RLS policies and table creations.

**Step 3: Run existing tests**
Run: `node test_workflow_variants.js`
Expected: PASS

**Step 4: Commit**
```bash
git add supabase_migration/create_pos_active_tabs.sql
git commit -m "db: add pos_active_tabs migration table"
```

---

### Task 2: Real-time Table Sync Hook (`useOpenTabs.js`)

**Files:**
- Modify: `src/hooks/useOpenTabs.js`
- Test: `test_workflow_variants.js`

**Step 1: Write the failing test**
Update `test_workflow_variants.js` to assert that tables created by one client session sync automatically to the global store using Supabase Realtime mock.

**Step 2: Run test to verify it fails**
Run: `node test_workflow_variants.js`
Expected: FAIL

**Step 3: Implement Supabase Realtime Channel and hooks**
Modify `src/hooks/useOpenTabs.js` to initialize the realtime listener, pull initial database state, and execute upserts/deletes against the `pos_active_tabs` table in Supabase.

**Step 4: Run test to verify it passes**
Run: `node test_workflow_variants.js`
Expected: PASS

**Step 5: Commit**
```bash
git add src/hooks/useOpenTabs.js
git commit -m "feat: implement Supabase Realtime active tabs synchronization"
```

---

### Task 3: Unify Kitchen Stream via Worker SSE

**Files:**
- Modify: `worker/src/index.js`
- Modify: `src/views/KitchenView.jsx`
- Test: `test_workflow_variants.js`

**Step 1: Write the failing test**
Assert that local POS orders trigger a webhook notify to the Worker which propagates SSE stream updates.

**Step 2: Run test to verify it fails**
Run: `node test_workflow_variants.js`
Expected: FAIL

**Step 3: Update Worker and KitchenView**
Add trigger webhook updates for `pos_active_tabs` and modify `KitchenView.jsx` to respond to the Unified stream.

**Step 4: Run test to verify it passes**
Run: `node test_workflow_variants.js`
Expected: PASS

**Step 5: Commit**
```bash
git add worker/src/index.js src/views/KitchenView.jsx
git commit -m "feat: unify kitchen SSE stream for local and web orders"
```

---

### Task 4: Local Print Queue Scheduler in `usePrinter.js`

**Files:**
- Modify: `src/hooks/usePrinter.js`
- Test: `test_workflow_variants.js`

**Step 1: Write the failing test**
Assert that printing when offline queues the job, and reconnecting processes the queue.

**Step 2: Run test to verify it fails**
Run: `node test_workflow_variants.js`
Expected: FAIL

**Step 3: Implement the print queue**
Add IndexedDB `my_print_queue` write actions and a background scheduler loop checking connection status in `usePrinter.js`.

**Step 4: Run test to verify it passes**
Run: `node test_workflow_variants.js`
Expected: PASS

**Step 5: Commit**
```bash
git add src/hooks/usePrinter.js
git commit -m "feat: implement resilient local print queue with auto-recovery"
```
