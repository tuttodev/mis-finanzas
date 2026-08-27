#!/usr/bin/env node

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";
import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error("Missing SUPABASE_URL or SUPABASE_ANON_KEY environment variables");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

const server = new McpServer({
  name: "mis-finanzas",
  version: "1.0.0",
});

server.tool(
  "get-transactions-by-date",
  "Get all transactions for a specific date, including account info",
  {
    date: z
      .string()
      .describe("Date in YYYY-MM-DD format"),
  },
  async ({ date }) => {
    const parsed = /^\d{4}-\d{2}-\d{2}$/.test(date);
    if (!parsed) {
      return {
        content: [{ type: "text", text: "Invalid date format. Use YYYY-MM-DD." }],
        isError: true,
      };
    }

    const { data, error } = await supabase
      .from("transactions")
      .select("id, date, description, amount, kind, transfer_id, created_at, account_id, accounts!inner(name, type)")
      .eq("date", date)
      .order("created_at", { ascending: false });

    if (error) {
      return {
        content: [{ type: "text", text: `Supabase error: ${error.message}` }],
        isError: true,
      };
    }

    if (!data || data.length === 0) {
      return {
        content: [{ type: "text", text: `No transactions found for ${date}.` }],
      };
    }

    const formatted = data.map((t) => {
      const account = t.accounts as unknown as { name: string; type: string };
      const amountFormatted = new Intl.NumberFormat("es-CO", {
        style: "currency",
        currency: "COP",
        maximumFractionDigits: 0,
      }).format(t.amount);

      return [
        `[${t.kind}] ${t.description}`,
        `  Amount: ${amountFormatted}`,
        `  Account: ${account.name} (${account.type})`,
        `  ID: ${t.id}`,
      ].join("\n");
    });

    return {
      content: [
        {
          type: "text",
          text: `Transactions for ${date} (${data.length} total):\n\n${formatted.join("\n\n")}`,
        },
      ],
    };
  },
);

async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
}

main().catch((err) => {
  console.error("Fatal error:", err);
  process.exit(1);
});
