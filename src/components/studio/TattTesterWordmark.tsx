type TattTesterWordmarkProps = {
  className?: string;
};

/** One spelling and markup treatment for the reader-facing product wordmark. */
export default function TattTesterWordmark({
  className = "",
}: TattTesterWordmarkProps) {
  return (
    <span className={className}>
      TATT<span className="text-pink">TESTER</span>
    </span>
  );
}
