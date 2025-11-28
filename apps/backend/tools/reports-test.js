#!/usr/bin/env node
import axios from "axios";

const apiBase = process.env.API_BASE_URL || "http://localhost:4000";
const token = process.env.TOKEN;

if (!token) {
  console.error("Please set TOKEN env var with a valid accessToken");
  process.exit(1);
}

async function call(path) {
  try {
    const res = await axios.get(`${apiBase}${path}`, {
      headers: { Authorization: `Bearer ${token}` },
      timeout: 5000,
    });
    console.log(`OK ${path} ->`, res.status);
    console.log(JSON.stringify(res.data, null, 2));
  } catch (err) {
    if (err.response) {
      console.log(`ERROR ${path} -> ${err.response.status}`);
      console.log(JSON.stringify(err.response.data, null, 2));
    } else {
      console.log(`ERROR ${path} ->`, err.message);
    }
  }
}

async function main() {
  console.log(`Testing reports endpoints against ${apiBase}`);
  await call("/api/reports/users/me/tickets");
  await call("/api/reports/agents/me/workload");
  await call("/api/reports/admin/overview");
  await call("/api/reports/tickets/export?format=json&scope=auto");
}

export default main;
