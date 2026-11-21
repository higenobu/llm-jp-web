const assert = require("node:assert/strict");
const fs = require("node:fs");
const { JSDOM } = require("jsdom");

const html = fs.readFileSync("static/classify.html", "utf8");

async function review({ pages, id, unsupported = false, pdfError = false }) {
  const calls = [];
  const dom = new JSDOM(html, {
    runScripts: "dangerously",
    url: "https://example.test/llmjp/classify?agent=1",
    beforeParse(window) {
      window.fetch = async (url, options) => {
        calls.push(url);
        if (url.endsWith("/login")) {
          return { ok: true, json: async () => ({ access_token: "test" }) };
        }
        assert.equal(options.headers.Authorization, "Bearer test");
        if (url.endsWith("/pdf-text")) {
          if (pdfError) return { ok: false, status: 422, json: async () => ({ detail: "Invalid PDF" }) };
          return { ok: true, json: async () => ({ text: "未公開の計画です。", pages, ocr_pages: [1] }) };
        }
        const { prompt } = JSON.parse(options.body);
        assert.match(prompt, /未公開の計画です/);
        if (prompt.includes("根拠の検証担当")) {
          const status = unsupported ? "unsupported" : "supported";
          const answer = JSON.stringify({
            checks: [{ id: 1, status, note: "根拠の確認結果" }],
            overall: { status, note: "区分の確認結果" },
          });
          return { ok: true, json: async () => ({ answer }) };
        }
        const answer = JSON.stringify({
          classification: "社外秘",
          summary: "未公開の計画",
          evidence: [{ id, reason: "根拠" }],
          uncertainties: [],
          recommended_action: "責任者が確認",
        });
        return { ok: true, json: async () => ({ answer }) };
      };
    },
  });

  try {
    const { document, Event, File } = dom.window;
    const get = id => document.getElementById(id);
    assert.equal(get("agentChat").hidden, false);
    assert.equal(get("agentBtn").disabled, true);
    get("loginForm").dispatchEvent(new Event("submit", { cancelable: true }));
    await new Promise(setImmediate);
    Object.defineProperty(get("pdfFile"), "files", {
      value: [new File(["test"], "test.pdf", { type: "application/pdf" })],
    });
    get("agentBtn").click();
    await new Promise(setImmediate);
    assert.deepEqual(calls, ["/llmjp/auth/login", "/llmjp/pdf-text",
      ...(pdfError ? [] : ["/llmjp/generate", ...(id === 1 ? ["/llmjp/generate"] : [])])]);
    const valid = !pdfError && id === 1;
    assert.equal(get("result").hidden, !valid);
    if (valid) {
      assert.equal(get("classification").textContent, unsupported ? "要確認" : "社外秘");
      assert.equal(get("evidence").querySelector("blockquote").textContent, "未公開の計画です。");
      assert.equal(get("evidence").textContent.includes("PDF 1ページ"), pages === 1);
    }
    get("logoutBtn").click();
    assert.equal(get("document").value, "");
    assert.equal(get("result").hidden, true);
  } finally {
    dom.window.close();
  }
}

(async () => {
  await review({ pages: 1, id: 1 });
  await review({ pages: 2, id: 1 });
  await review({ pages: 1, id: 1, unsupported: true });
  await review({ pages: 1, id: 99 });
  await review({ pages: 1, pdfError: true });
  console.log("Agent workflow: extraction, page attribution, evidence ID validation and logout passed");
})().catch(error => {
  console.error(error);
  process.exitCode = 1;
});
