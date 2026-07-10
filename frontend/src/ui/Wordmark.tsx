// "Njiko" wordmark with the j visually distinguished so it doesn't read as an i.
export function Wordmark({ className }: { className?: string }) {
  return (
    <div className={className} aria-label="Njiko">
      <span className="njk-w-n">N</span><span className="njk-w-j">j</span><span className="njk-w-rest">iko</span>
    </div>
  );
}
