import { Path, Svg, SvgProps } from '../../Svg';

const XCloseCircleIcon = ({ title, ...props }: SvgProps) => {
    return (
        <Svg {...props}>
            <Path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M15 9l-6 6m0-6l6 6m7-3c0 5.523-4.477 10-10 10S2 17.523 2 12 6.477 2 12 2s10 4.477 10 10z"
            ></Path>
        </Svg>
    );
}

export { XCloseCircleIcon };


