import { Path, Svg, SvgProps } from '../../Svg';

const DownloadIcon = ({ title, ...props }: SvgProps) => {
    return (
        <Svg {...props}>
            <Path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M4 16.242A4.5 4.5 0 016.08 8.02a6.002 6.002 0 0111.84 0A4.5 4.5 0 0120 16.242M8 17l4 4m0 0l4-4m-4 4v-9"
            ></Path>
        </Svg>
    );
}

export { DownloadIcon };