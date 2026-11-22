type IconProps = { className?: string };

const base = "h-4 w-4";

function svg(path: React.ReactNode, className = base) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.6}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      className={className}
    >
      {path}
    </svg>
  );
}

export const SearchIcon = ({ className }: IconProps) =>
  svg(
    <>
      <circle cx="11" cy="11" r="6.5" />
      <path d="m16 16 4 4" />
    </>,
    className,
  );

export const LocateIcon = ({ className }: IconProps) =>
  svg(
    <>
      <circle cx="12" cy="12" r="3" />
      <circle cx="12" cy="12" r="7.5" />
      <path d="M12 2v2M12 20v2M2 12h2M20 12h2" />
    </>,
    className,
  );

export const RefreshIcon = ({ className }: IconProps) =>
  svg(
    <>
      <path d="M20 11a8 8 0 1 0-2.3 5.7" />
      <path d="M20 5v6h-6" />
    </>,
    className,
  );

export const ChevronIcon = ({ className }: IconProps) =>
  svg(<path d="m6 9 6 6 6-6" />, className);

export const CloseIcon = ({ className }: IconProps) =>
  svg(<path d="M6 6l12 12M18 6L6 18" />, className);

export const SparkIcon = ({ className }: IconProps) =>
  svg(
    <>
      <path d="M12 3v4M12 17v4M3 12h4M17 12h4" />
      <path d="M6.5 6.5l2 2M15.5 15.5l2 2M17.5 6.5l-2 2M8.5 15.5l-2 2" />
    </>,
    className,
  );

export const ArrowIcon = ({ className }: IconProps) =>
  svg(
    <>
      <path d="M5 12h14" />
      <path d="m13 6 6 6-6 6" />
    </>,
    className,
  );

export const WindIcon = ({ className }: IconProps) =>
  svg(
    <>
      <path d="M3 8h11a3 3 0 1 0-3-3" />
      <path d="M3 12h15a3 3 0 1 1-3 3" />
      <path d="M3 16h8" />
    </>,
    className,
  );

export const ThermometerIcon = ({ className }: IconProps) =>
  svg(
    <>
      <path d="M12 14V5a2 2 0 1 1 4 0v9a4 4 0 1 1-4 0Z" />
      <path d="M14 9v5" />
    </>,
    className,
  );

export const DropIcon = ({ className }: IconProps) =>
  svg(<path d="M12 3.5c3 3.6 5.5 6.6 5.5 9.5a5.5 5.5 0 0 1-11 0c0-2.9 2.5-5.9 5.5-9.5Z" />, className);

export const ShieldIcon = ({ className }: IconProps) =>
  svg(
    <>
      <path d="M12 3.5 19 6v6c0 4-3 7-7 8.5C8 19 5 16 5 12V6l7-2.5Z" />
      <path d="m9.2 12 2 2 3.6-3.8" />
    </>,
    className,
  );

export const UsersIcon = ({ className }: IconProps) =>
  svg(
    <>
      <path d="M16 19v-1.5a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4V19" />
      <circle cx="9" cy="7.5" r="3.5" />
      <path d="M22 19v-1.5a4 4 0 0 0-3-3.87" />
      <path d="M16 4.13a4 4 0 0 1 0 7.75" />
    </>,
    className,
  );

export const CheckIcon = ({ className }: IconProps) =>
  svg(<path d="m5 12.5 4.5 4.5L19 7" />, className);

export const AlertIcon = ({ className }: IconProps) =>
  svg(
    <>
      <path d="M12 4.5 21 20H3L12 4.5Z" />
      <path d="M12 10v4M12 17h.01" />
    </>,
    className,
  );
