import { Path, Svg, SvgProps } from '../../Svg';

const RefreshIcon = ({ title, ...props }: SvgProps) => {
    return (
        <Svg {...props}>
            <Path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M22 10s-2.005-2.732-3.634-4.362a9 9 0 1 0 2.282 8.862M22 10V4m0 6h-6"
            ></Path>
        </Svg>
    );
}

export { RefreshIcon };
