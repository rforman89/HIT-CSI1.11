import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.105.4";
import { createHandler } from "../_shared/handler.mjs";

serve(createHandler(createClient, (name: string) => Deno.env.get(name)));
