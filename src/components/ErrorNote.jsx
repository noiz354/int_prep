export function ErrorNote({ error }) {
  if (!error) return null;
  const message = typeof error === 'string' ? error : error.message;
  const traceId = typeof error === 'object' ? error.traceId : null;
  return (
    <p className="login-error" role="alert">
      {message}
      {traceId ? <><br /><span className="support-trace">Support trace id: {traceId}</span></> : null}
    </p>
  );
}
