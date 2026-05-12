import { Path, Svg, SvgProps } from '../../Svg';

const PlusIcon = ({ title, ...props }: SvgProps) => {
    return (
        <Svg {...props}>
            <Path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M12 5v14m-7-7h14"
            ></Path>
        </Svg>
    );
}

export { PlusIcon };
