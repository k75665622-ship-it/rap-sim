// ─── LINE ICON SET ─────────────────────────────────────────────────────────
// One consistent set: 20px default, 1.75 stroke, round caps, currentColor.
// Replaces the emoji that used to stand in for navigation icons — emoji render
// at different weights and sizes per platform and made the sidebar look uneven.

import type { SVGProps } from 'react';

export interface IconProps extends Omit<SVGProps<SVGSVGElement>, 'name'> {
  size?: number;
}

function svg(path: React.ReactNode, displayName: string) {
  const C = ({ size = 20, ...rest }: IconProps) => (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.75}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      {...rest}
    >
      {path}
    </svg>
  );
  C.displayName = displayName;
  return C;
}

export const IconHome = svg(
  <>
    <path d="M3 10.5 12 3l9 7.5" />
    <path d="M5.5 9.5V20h13V9.5" />
  </>,
  'IconHome',
);

export const IconMic = svg(
  <>
    <rect x="9" y="2.5" width="6" height="11" rx="3" />
    <path d="M5.5 11a6.5 6.5 0 0 0 13 0" />
    <path d="M12 17.5V21" />
  </>,
  'IconMic',
);

export const IconStats = svg(
  <>
    <path d="M4 20V10" />
    <path d="M10 20V4" />
    <path d="M16 20v-7" />
    <path d="M21 20H3" />
  </>,
  'IconStats',
);

export const IconDumbbell = svg(
  <>
    <path d="M3 9v6" />
    <path d="M6.5 6.5v11" />
    <path d="M17.5 6.5v11" />
    <path d="M21 9v6" />
    <path d="M6.5 12h11" />
  </>,
  'IconDumbbell',
);

export const IconBriefcase = svg(
  <>
    <rect x="2.5" y="7" width="19" height="13" rx="2" />
    <path d="M8.5 7V5.5A2 2 0 0 1 10.5 3.5h3A2 2 0 0 1 15.5 5.5V7" />
    <path d="M2.5 12.5h19" />
  </>,
  'IconBriefcase',
);

export const IconTicket = svg(
  <>
    <path d="M3 8.5A2 2 0 0 1 5 6.5h14a2 2 0 0 1 2 2v1.5a2 2 0 0 0 0 4V15a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-1.5a2 2 0 0 0 0-4z" />
    <path d="M12 8.5v7" />
  </>,
  'IconTicket',
);

export const IconMusic = svg(
  <>
    <circle cx="7" cy="18" r="3" />
    <circle cx="18" cy="15.5" r="3" />
    <path d="M10 18V6.5l11-2v11" />
  </>,
  'IconMusic',
);

export const IconPlay = svg(
  <>
    <rect x="2.5" y="4.5" width="19" height="15" rx="3" />
    <path d="M10 9.5l5 2.5-5 2.5z" />
  </>,
  'IconPlay',
);

export const IconPause = svg(
  <>
    <rect x="6.5" y="5" width="3.5" height="14" rx="1.2" />
    <rect x="14" y="5" width="3.5" height="14" rx="1.2" />
  </>,
  'IconPause',
);

export const IconMessage = svg(
  <>
    <path d="M20.5 12.5a7.5 7.5 0 0 1-10.9 6.7L4 20.5l1.4-5.2A7.5 7.5 0 1 1 20.5 12.5z" />
  </>,
  'IconMessage',
);

export const IconMail = svg(
  <>
    <rect x="2.5" y="5" width="19" height="14" rx="2" />
    <path d="m3.5 7 8.5 6 8.5-6" />
  </>,
  'IconMail',
);

export const IconNews = svg(
  <>
    <path d="M4 5h12v14H5.5A1.5 1.5 0 0 1 4 17.5z" />
    <path d="M16 9h3.5A1.5 1.5 0 0 1 21 10.5v7a1.5 1.5 0 0 1-3 0V9z" />
    <path d="M7 8.5h6M7 12h6M7 15.5h4" />
  </>,
  'IconNews',
);

export const IconUsers = svg(
  <>
    <circle cx="9" cy="8" r="3.5" />
    <path d="M2.5 20a6.5 6.5 0 0 1 13 0" />
    <path d="M16 5.2a3.5 3.5 0 0 1 0 6.6" />
    <path d="M17.5 14.2A6.5 6.5 0 0 1 21.5 20" />
  </>,
  'IconUsers',
);

/** A crew: a person with the people who work for them. */
export const IconTeam = svg(
  <>
    <circle cx="8.5" cy="7.5" r="3" />
    <path d="M3 19.5a5.5 5.5 0 0 1 11 0" />
    <path d="M16.5 5.5a3 3 0 0 1 0 5.4" />
    <path d="M18 19.5c0-2-.6-3.6-1.6-4.6" />
    <path d="M20 11.5v5M17.5 14h5" />
  </>,
  'IconTeam',
);

export const IconReceipt = svg(
  <>
    <path d="M5 3.5h14v17l-2.3-1.6-2.4 1.6-2.3-1.6-2.4 1.6L7.3 19 5 20.5z" />
    <path d="M9 8.5h6M9 12.5h6" />
  </>,
  'IconReceipt',
);

/** Careers: stacked layers — more than one of the same thing. */
export const IconCareers = svg(
  <>
    <path d="M12 3 3 7.5l9 4.5 9-4.5z" />
    <path d="M3 12.2 12 16.7l9-4.5" />
    <path d="M3 16.6 12 21.1l9-4.5" />
  </>,
  'IconCareers',
);

export const IconInterview = svg(
  <>
    <rect x="8" y="2.5" width="8" height="13" rx="4" />
    <path d="M5 11a7 7 0 0 0 14 0" />
    <path d="M12 18v3.5" />
    <path d="M8.5 21.5h7" />
  </>,
  'IconInterview',
);

export const IconTrend = svg(
  <>
    <path d="M3 17l5.5-6 4 3.5L21 6" />
    <path d="M15.5 6H21v5.5" />
  </>,
  'IconTrend',
);

export const IconDiamond = svg(
  <>
    <path d="M7 3.5h10l4 5.5-9 11.5L3 9z" />
    <path d="M3 9h18" />
    <path d="M12 20.5 8 9l2-5.5M12 20.5 16 9l-2-5.5" />
  </>,
  'IconDiamond',
);

export const IconShirt = svg(
  <path d="M8.5 3.5 4 6l-1.5 4.5 3 1.2V20.5h13V11.7l3-1.2L20 6l-4.5-2.5c-.6 1.6-2 2.6-3.5 2.6s-2.9-1-3.5-2.6Z" />,
  'IconShirt',
);
export const IconJournal = svg(
  <>
    <path d="M6 3.5h11.5a1 1 0 0 1 1 1v15a1 1 0 0 1-1 1H6a1.5 1.5 0 0 1-1.5-1.5v-14A1.5 1.5 0 0 1 6 3.5Z" />
    <path d="M8.5 8h6.5M8.5 11.5h6.5M8.5 15h4" />
  </>,
  'IconJournal',
);
export const IconUser = svg(
  <>
    <circle cx="12" cy="8.5" r="3.8" />
    <path d="M4.5 20c.9-3.6 3.9-5.6 7.5-5.6s6.6 2 7.5 5.6" />
  </>,
  'IconUser',
);
export const IconTrophy = svg(
  <>
    <path d="M7 4h10v5a5 5 0 0 1-10 0z" />
    <path d="M7 5.5H4.5v1A3 3 0 0 0 7 9.5M17 5.5h2.5v1A3 3 0 0 1 17 9.5" />
    <path d="M12 14v3.5" />
    <path d="M8 20.5h8" />
    <path d="M9.5 20.5c0-1.7 1.1-3 2.5-3s2.5 1.3 2.5 3" />
  </>,
  'IconTrophy',
);

export const IconBell = svg(
  <>
    <path d="M6 10a6 6 0 1 1 12 0c0 3.2.8 4.6 1.5 5.5H4.5C5.2 14.6 6 13.2 6 10z" />
    <path d="M10 18.5a2 2 0 0 0 4 0" />
  </>,
  'IconBell',
);

export const IconSearch = svg(
  <>
    <circle cx="10.5" cy="10.5" r="6.5" />
    <path d="m15.5 15.5 5 5" />
  </>,
  'IconSearch',
);

export const IconChevronDown = svg(<path d="m6 9.5 6 6 6-6" />, 'IconChevronDown');
export const IconChevronRight = svg(<path d="m9.5 6 6 6-6 6" />, 'IconChevronRight');
export const IconChevronLeft = svg(<path d="m14.5 6-6 6 6 6" />, 'IconChevronLeft');
export const IconArrowUp = svg(<path d="M12 19V5m0 0-6 6m6-6 6 6" />, 'IconArrowUp');
export const IconArrowDown = svg(<path d="M12 5v14m0 0 6-6m-6 6-6-6" />, 'IconArrowDown');
export const IconMinus = svg(<path d="M5 12h14" />, 'IconMinus');
export const IconPlus = svg(<path d="M12 5v14M5 12h14" />, 'IconPlus');
export const IconCheck = svg(<path d="m4.5 12.5 5 5 10-11" />, 'IconCheck');
export const IconX = svg(<path d="M6 6l12 12M18 6 6 18" />, 'IconX');
export const IconMenu = svg(<path d="M3.5 7h17M3.5 12h17M3.5 17h17" />, 'IconMenu');

export const IconThumbUp = svg(
  <>
    <path d="M7 10.5v9.5H4.5A1.5 1.5 0 0 1 3 18.5v-6.5A1.5 1.5 0 0 1 4.5 10.5z" />
    <path d="M7 10.5 11.5 3a2.5 2.5 0 0 1 2.5 2.5V9h4.6a2 2 0 0 1 2 2.4l-1.2 6.6a2 2 0 0 1-2 1.6H7z" />
  </>,
  'IconThumbUp',
);

export const IconThumbDown = svg(
  <>
    <path d="M7 13.5V4H4.5A1.5 1.5 0 0 0 3 5.5V12a1.5 1.5 0 0 0 1.5 1.5z" />
    <path d="M7 13.5 11.5 21a2.5 2.5 0 0 0 2.5-2.5V15h4.6a2 2 0 0 0 2-2.4l-1.2-6.6a2 2 0 0 0-2-1.6H7z" />
  </>,
  'IconThumbDown',
);

export const IconShare = svg(
  <>
    <path d="M12 3.5v11" />
    <path d="m8 7.5 4-4 4 4" />
    <path d="M5 13v6.5h14V13" />
  </>,
  'IconShare',
);

export const IconComment = svg(
  <>
    <path d="M21 12a8 8 0 0 1-11.6 7.1L4 20.5l1.4-5.2A8 8 0 1 1 21 12z" />
  </>,
  'IconComment',
);

export const IconClock = svg(
  <>
    <circle cx="12" cy="12" r="8.5" />
    <path d="M12 7.5V12l3 2" />
  </>,
  'IconClock',
);

export const IconDisc = svg(
  <>
    <circle cx="12" cy="12" r="9" />
    <circle cx="12" cy="12" r="2.5" />
  </>,
  'IconDisc',
);

export const IconSparkle = svg(
  <>
    <path d="M12 3.5l1.9 5.1 5.1 1.9-5.1 1.9L12 17.5l-1.9-5.1L5 10.5l5.1-1.9z" />
    <path d="M18.5 16.5l.8 2 2 .8-2 .8-.8 2-.8-2-2-.8 2-.8z" />
  </>,
  'IconSparkle',
);

export const IconVerified = svg(
  <>
    <path d="M12 2.8l2.3 2 3-.3 1.2 2.8 2.7 1.4-.8 2.9.8 2.9-2.7 1.4-1.2 2.8-3-.3-2.3 2-2.3-2-3 .3-1.2-2.8L3.8 15l.8-2.9-.8-2.9 2.7-1.4L7.7 4.5l3 .3z" />
    <path d="m8.8 12.2 2.2 2.2 4.2-4.4" />
  </>,
  'IconVerified',
);

export const IconGlobe = svg(
  <>
    <circle cx="12" cy="12" r="8.5" />
    <path d="M3.5 12h17" />
    <path d="M12 3.5c2.2 2.4 3.3 5.3 3.3 8.5S14.2 18.1 12 20.5c-2.2-2.4-3.3-5.3-3.3-8.5S9.8 5.9 12 3.5z" />
  </>,
  'IconGlobe',
);

export const IconFilter = svg(
  <>
    <path d="M3.5 6h17" />
    <path d="M6.5 12h11" />
    <path d="M10 18h4" />
  </>,
  'IconFilter',
);

export const IconCamera = svg(
  <>
    <path d="M3 8.5A2 2 0 0 1 5 6.5h1.8l1.2-2h8l1.2 2H19a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
    <circle cx="12" cy="12.5" r="3.5" />
  </>,
  'IconCamera',
);

export const IconBird = svg(
  <>
    <path d="M21 6.5c-.7.4-1.5.7-2.3.8A4 4 0 0 0 20.5 5a8 8 0 0 1-2.6 1A4 4 0 0 0 11 9.2v.9A11 11 0 0 1 3 6s-3.3 7 4 10.5a12 12 0 0 1-6 1.5c3 2 6.5 2.5 10 2 6.5-.8 9.7-5.7 9.7-10.4v-.6A7.5 7.5 0 0 0 21 6.5z" />
  </>,
  'IconBird',
);

export const IconCircle = svg(
  <>
    <circle cx="12" cy="12" r="8.5" />
    <path d="M12 8v8M8 12h8" />
  </>,
  'IconCircle',
);

export const IconFilm = svg(
  <>
    <rect x="2.5" y="4.5" width="19" height="15" rx="2" />
    <path d="M7 4.5v15M17 4.5v15M2.5 12h19M2.5 8.2h4.5M2.5 15.8h4.5M17 8.2h4.5M17 15.8h4.5" />
  </>,
  'IconFilm',
);

export const IconBookmark = svg(
  <path d="M6 3.5h12v17l-6-4.2-6 4.2z" />,
  'IconBookmark',
);

export const IconInfo = svg(
  <>
    <circle cx="12" cy="12" r="8.5" />
    <path d="M12 11v5.5M12 7.8v.4" />
  </>,
  'IconInfo',
);

export const IconAlert = svg(
  <>
    <path d="M12 3.5 21 19.5H3z" />
    <path d="M12 9.5v4.5M12 16.8v.4" />
  </>,
  'IconAlert',
);
