import { Path, Svg, SvgProps } from '../../Svg';

const ListIcon = ({ title, ...props }: SvgProps) => {
    return (
        <Svg {...props}>
            <Path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M21 12H9m12-6H9m12 12H9m-4-6a1 1 0 11-2 0 1 1 0 012 0zm0-6a1 1 0 11-2 0 1 1 0 012 0zm0 12a1 1 0 11-2 0 1 1 0 012 0z"
            ></Path>
        </Svg>
    );
}

export { ListIcon };
