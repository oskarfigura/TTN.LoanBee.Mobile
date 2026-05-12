import { Path, Svg, SvgProps } from '../../Svg';

const SearchIcon = ({ title, ...props }: SvgProps) => {
    return (
        <Svg {...props}>
            <Path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="m21 21-4.35-4.35M19 11a8 8 0 1 1-16 0 8 8 0 0 1 16 0"
            ></Path>
        </Svg>
    );
}

export { SearchIcon }
