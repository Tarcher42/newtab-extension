// Icons from Lucide (ISC), drawn as strokes so they sit well next to the mono type.
import type { JSX } from 'preact'

type IconProps = JSX.SVGAttributes<SVGSVGElement>

const Icon = ({ children, ...props }: IconProps) => (
    <svg
        viewBox="0 0 24 24"
        width="1em"
        height="1em"
        fill="none"
        stroke="currentColor"
        stroke-width="2"
        stroke-linecap="round"
        stroke-linejoin="round"
        aria-hidden="true"
        {...props}
    >
        {children}
    </svg>
)

export const GearIcon = (props: IconProps) => (
    <Icon {...props}>
        <path d="M9.671 4.136a2.34 2.34 0 0 1 4.659 0 2.34 2.34 0 0 0 3.319 1.915 2.34 2.34 0 0 1 2.33 4.033 2.34 2.34 0 0 0 0 3.831 2.34 2.34 0 0 1-2.33 4.033 2.34 2.34 0 0 0-3.319 1.915 2.34 2.34 0 0 1-4.659 0 2.34 2.34 0 0 0-3.32-1.915 2.34 2.34 0 0 1-2.33-4.033 2.34 2.34 0 0 0 0-3.831A2.34 2.34 0 0 1 6.35 6.051a2.34 2.34 0 0 0 3.319-1.915" />
        <circle cx="12" cy="12" r="3" />
    </Icon>
)

export const CloseIcon = (props: IconProps) => (
    <Icon {...props}>
        <path d="M18 6 6 18" />
        <path d="m6 6 12 12" />
    </Icon>
)

export const AddIcon = (props: IconProps) => (
    <Icon {...props}>
        <path d="M5 12h14" />
        <path d="M12 5v14" />
    </Icon>
)

export const TrashIcon = (props: IconProps) => (
    <Icon {...props}>
        <path d="M10 11v6" />
        <path d="M14 11v6" />
        <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6" />
        <path d="M3 6h18" />
        <path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
    </Icon>
)

export const VolumeIcon = (props: IconProps) => (
    <Icon {...props}>
        <path d="M11 4.702a.705.705 0 0 0-1.203-.498L6.413 7.587A1.4 1.4 0 0 1 5.416 8H3a1 1 0 0 0-1 1v6a1 1 0 0 0 1 1h2.416a1.4 1.4 0 0 1 .997.413l3.383 3.384A.705.705 0 0 0 11 19.298z" />
        <path d="M16 9a5 5 0 0 1 0 6" />
        <path d="M19.364 18.364a9 9 0 0 0 0-12.728" />
    </Icon>
)

export const DownloadIcon = (props: IconProps) => (
    <Icon {...props}>
        <path d="M12 15V3" />
        <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
        <path d="m7 10 5 5 5-5" />
    </Icon>
)

export const PencilIcon = (props: IconProps) => (
    <Icon {...props}>
        <path d="M21.174 6.812a1 1 0 0 0-3.986-3.987L3.842 16.174a2 2 0 0 0-.5.83l-1.321 4.352a.5.5 0 0 0 .623.622l4.353-1.32a2 2 0 0 0 .83-.497z" />
        <path d="m15 5 4 4" />
    </Icon>
)

export const RestoreIcon = (props: IconProps) => (
    <Icon {...props}>
        <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" />
        <path d="M3 3v5h5" />
    </Icon>
)

export const SearchIcon = (props: IconProps) => (
    <Icon {...props}>
        <path d="m21 21-4.34-4.34" />
        <circle cx="11" cy="11" r="8" />
    </Icon>
)

export const BackIcon = (props: IconProps) => (
    <Icon {...props}>
        <path d="m15 18-6-6 6-6" />
    </Icon>
)
