import { Path, Svg, SvgProps } from '../../Svg';

const CheckIcon = ({ title, ...props }: SvgProps) => {
    return (
        <Svg {...props}>
            <Path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M20 6 9 17l-5-5"
            ></Path>
        </Svg>
    );
}

export { CheckIcon };
