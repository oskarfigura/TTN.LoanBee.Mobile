import { Path, G, Svg, SvgProps } from '../../Svg';

const LocationMarkerIcon = ({ title, ...props }: SvgProps) => {
    return (
        <Svg {...props}>
            <G
                strokeLinecap="round"
                strokeLinejoin="round"
                clipPath="url(#clip0_1007_11833)"
            >
                <Path d="M12 13a3 3 0 1 0 0-6 3 3 0 0 0 0 6"></Path>
                <Path d="M12 22c4-4 8-7.582 8-12a8 8 0 1 0-16 0c0 4.418 4 8 8 12"></Path>
            </G>
        </Svg>
    );
}

export { LocationMarkerIcon }
