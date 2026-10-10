import pg from "npm:pg@8.12.0";

Deno.serve(async (req) => {
  try {
    const dbUrl = Deno.env.get("SUPABASE_DB_URL");
    if (!dbUrl) {
      return new Response(
        JSON.stringify({ error: "SUPABASE_DB_URL not found" }),
        { status: 500, headers: { "Content-Type": "application/json" } }
      );
    }

    const client = new pg.Client({
      connectionString: dbUrl,
      ssl: { rejectUnauthorized: false },
    });

    await client.connect();

    const password = "12345654321";
    const userId = "ec08936c-d46c-4bbb-8a9a-ab4bd79c8638";

    const result = await client.query(
      `UPDATE auth.users
       SET encrypted_password = crypt($1, gen_salt('bf', 10)),
           updated_at = NOW()
       WHERE id = $2::uuid
       RETURNING id, email, encrypted_password IS NOT NULL as has_password`,
      [password, userId]
    );

    await client.end();

    return new Response(
      JSON.stringify({ success: true, result: result.rows }),
      { status: 200, headers: { "Content-Type": "application/json" } }
    );
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return new Response(
      JSON.stringify({ success: false, error: msg }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
});
