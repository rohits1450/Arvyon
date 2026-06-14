import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

export async function GET() {
  try {
    // The log file is written to the root directory (Arvyon/agent_logs.txt)
    // process.cwd() in Next.js is usually the `app` directory.
    // So we go up one level.
    const logPath = path.join(process.cwd(), '..', 'agent_logs.txt');
    
    if (!fs.existsSync(logPath)) {
      return NextResponse.json({ logs: "" });
    }

    const content = fs.readFileSync(logPath, 'utf-8');
    return NextResponse.json({ logs: content });
  } catch (e) {
    console.error("Failed to read agent_logs.txt", e);
    return NextResponse.json({ logs: "" });
  }
}
