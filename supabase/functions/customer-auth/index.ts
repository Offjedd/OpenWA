import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json", ...corsHeaders },
  });
}

// Simple HMAC-SHA256 JWT implementation using Web Crypto
async function signJwt(payload: Record<string, unknown>, secret: string): Promise<string> {
  const header = { alg: "HS256", typ: "JWT" };
  const encode = (obj: unknown) =>
    btoa(JSON.stringify(obj)).replace(/=/g, "").replace(/\+/g, "-").replace(/\//g, "_");

  const headerB64 = encode(header);
  const payloadB64 = encode({ ...payload, iat: Math.floor(Date.now() / 1000) });
  const signingInput = `${headerB64}.${payloadB64}`;

  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const sig = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(signingInput));
  const sigB64 = btoa(String.fromCharCode(...new Uint8Array(sig)))
    .replace(/=/g, "").replace(/\+/g, "-").replace(/\//g, "_");

  return `${signingInput}.${sigB64}`;
}

// bcrypt-compatible hash using scrypt via Web Crypto (stored in DB as bcrypt, so we use a custom prefix)
// Since we can't use bcrypt in Deno edge, we store/compare using SHA-256 with salt for new registrations
// and fall back to comparing raw if the hash doesn't start with $2 (legacy bcrypt from NestJS)
async function hashPassword(password: string): Promise<string> {
  const salt = crypto.randomUUID().replace(/-/g, "");
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(password),
    { name: "PBKDF2" },
    false,
    ["deriveBits"],
  );
  const bits = await crypto.subtle.deriveBits(
    { name: "PBKDF2", salt: new TextEncoder().encode(salt), iterations: 100000, hash: "SHA-256" },
    key,
    256,
  );
  const hash = Array.from(new Uint8Array(bits)).map(b => b.toString(16).padStart(2, "0")).join("");
  return `$pbkdf2$${salt}$${hash}`;
}

async function verifyPassword(password: string, stored: string): Promise<boolean> {
  if (stored.startsWith("$pbkdf2$")) {
    const parts = stored.split("$");
    // $pbkdf2$<salt>$<hash>
    const salt = parts[2];
    const expectedHash = parts[3];
    const key = await crypto.subtle.importKey(
      "raw",
      new TextEncoder().encode(password),
      { name: "PBKDF2" },
      false,
      ["deriveBits"],
    );
    const bits = await crypto.subtle.deriveBits(
      { name: "PBKDF2", salt: new TextEncoder().encode(salt), iterations: 100000, hash: "SHA-256" },
      key,
      256,
    );
    const hash = Array.from(new Uint8Array(bits)).map(b => b.toString(16).padStart(2, "0")).join("");
    return hash === expectedHash;
  }
  // bcrypt hashes from NestJS backend — can't verify in edge without bcrypt lib
  // Return false; users registered via backend must re-register via edge or use backend
  return false;
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  const url = new URL(req.url);
  const action = url.searchParams.get("action") || url.pathname.split("/").pop();

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const jwtSecret = Deno.env.get("CUSTOMER_JWT_SECRET") || "openwa-customer-secret";

  const supabase = createClient(supabaseUrl, serviceKey);

  try {
    if (action === "register") {
      const { fullName, email, password } = await req.json();
      if (!fullName || !email || !password) {
        return json({ message: "fullName, email and password are required" }, 400);
      }

      const { data: existing } = await supabase
        .from("customers")
        .select("id")
        .eq("email", email)
        .maybeSingle();

      if (existing) {
        return json({ message: "An account with this email already exists" }, 409);
      }

      const passwordHash = await hashPassword(password);
      const id = crypto.randomUUID();
      const now = new Date().toISOString();

      const { error } = await supabase.from("customers").insert({
        id,
        email,
        full_name: fullName,
        password_hash: passwordHash,
        plan: "free",
        is_active: true,
        created_at: now,
        updated_at: now,
      });

      if (error) {
        return json({ message: error.message }, 500);
      }

      const token = await signJwt({ sub: id, email, plan: "free" }, jwtSecret);
      return json({
        token,
        customer: { id, email, fullName, plan: "free", isActive: true, createdAt: now },
      });
    }

    if (action === "login") {
      const { email, password } = await req.json();
      if (!email || !password) {
        return json({ message: "email and password are required" }, 400);
      }

      const { data: customer, error } = await supabase
        .from("customers")
        .select("id, email, full_name, password_hash, plan, is_active, created_at")
        .eq("email", email)
        .maybeSingle();

      if (error || !customer) {
        return json({ message: "Invalid email or password" }, 401);
      }

      if (!customer.is_active) {
        return json({ message: "Account is deactivated" }, 401);
      }

      const valid = await verifyPassword(password, customer.password_hash);
      if (!valid) {
        return json({ message: "Invalid email or password" }, 401);
      }

      const token = await signJwt(
        { sub: customer.id, email: customer.email, plan: customer.plan },
        jwtSecret,
      );
      return json({
        token,
        customer: {
          id: customer.id,
          email: customer.email,
          fullName: customer.full_name,
          plan: customer.plan,
          isActive: customer.is_active,
          createdAt: customer.created_at,
        },
      });
    }

    return json({ message: "Unknown action. Use ?action=register or ?action=login" }, 400);
  } catch (err) {
    return json({ message: String(err) }, 500);
  }
});
