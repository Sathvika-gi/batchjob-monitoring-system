const MONGODB_URI_PATTERN = /mongodb(?:\+srv)?:\/\/[^\s"'`<>]+/gi;

export function redactMongoUri(value) {
  return String(value ?? '').replace(MONGODB_URI_PATTERN, '[redacted MongoDB URI]');
}
