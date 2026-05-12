import { Path, Svg, SvgProps } from '../../Svg';

const ArrowLeftIcon = ({ title, ...props }: SvgProps) => {
    return (
        <Svg {...props}>
            <Path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M19 12H5m0 0l7 7m-7-7l7-7"
            ></Path>
        </Svg>
    );
}

export { ArrowLeftIcon };

