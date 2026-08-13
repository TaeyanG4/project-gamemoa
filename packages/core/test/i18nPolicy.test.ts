import test from "node:test";
import assert from "node:assert/strict";
import {
  SUPPORTED_LOCALES,
  DEFAULT_LOCALE,
  isSupportedLocale,
  resolveLocale,
  matchBrowserLocale,
} from "../src/domain/i18nPolicy.js";

test("SUPPORTED_LOCALES is exactly the four sprint locales, zh-TW excluded", () => {
  assert.deepEqual(SUPPORTED_LOCALES, ["ko-KR", "en-US", "ja-JP", "zh-CN"]);
  assert.equal(SUPPORTED_LOCALES.includes("zh-TW" as never), false);
});

test("DEFAULT_LOCALE is ko-KR", () => {
  assert.equal(DEFAULT_LOCALE, "ko-KR");
});

test("isSupportedLocale accepts only the four supported values", () => {
  assert.equal(isSupportedLocale("ko-KR"), true);
  assert.equal(isSupportedLocale("en-US"), true);
  assert.equal(isSupportedLocale("ja-JP"), true);
  assert.equal(isSupportedLocale("zh-CN"), true);
  assert.equal(isSupportedLocale("zh-TW"), false);
  assert.equal(isSupportedLocale("fr-FR"), false);
  assert.equal(isSupportedLocale(null), false);
  assert.equal(isSupportedLocale(undefined), false);
  assert.equal(isSupportedLocale(""), false);
});

test("resolveLocale falls back to ko-KR for any invalid/unsupported value", () => {
  assert.equal(resolveLocale("en-US"), "en-US");
  assert.equal(resolveLocale("zh-TW"), "ko-KR");
  assert.equal(resolveLocale("not-a-locale"), "ko-KR");
  assert.equal(resolveLocale(null), "ko-KR");
  assert.equal(resolveLocale(undefined), "ko-KR");
});

test("matchBrowserLocale: exact match wins", () => {
  assert.equal(matchBrowserLocale(["en-US", "en"]), "en-US");
});

test("matchBrowserLocale: bare-language fallback matches (e.g. 'en' -> 'en-US')", () => {
  assert.equal(matchBrowserLocale(["en"]), "en-US");
  assert.equal(matchBrowserLocale(["ja"]), "ja-JP");
  assert.equal(matchBrowserLocale(["zh"]), "zh-CN");
});

test("matchBrowserLocale: no match returns null (caller falls back to DEFAULT_LOCALE)", () => {
  assert.equal(matchBrowserLocale(["fr-FR", "de-DE"]), null);
  assert.equal(matchBrowserLocale([]), null);
});
