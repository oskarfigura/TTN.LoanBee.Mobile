import { Path, Svg, SvgProps } from '../../Svg';

const XCloseIcon = ({ title, ...props }: SvgProps) => {
    return (
        <Svg {...props}>
            <Path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M18 6L6 18M6 6l12 12"
            ></Path>
        </Svg>
    );
}

export { XCloseIcon };