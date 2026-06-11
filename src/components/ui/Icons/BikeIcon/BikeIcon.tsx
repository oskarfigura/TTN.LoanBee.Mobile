import { colours } from '@/theme';
import { Path, Svg, SvgProps } from '../../Svg';

const BikeIcon = ({ title, color = colours.textPrimary, ...props }: SvgProps) => {
    return (
        <Svg {...props} color={color} stroke="none">
            <Path
                fill={color}
                d="M19 11.1V4a1 1 0 0 0-1-1h-4a1 1 0 0 0 0 2h3v3H8a1 1 0 0 0-.962.725l-.661 2.313A4 4 0 0 0 6 11a5.068 5.068 0 1 0 2.3.587L8.754 10H17v1.1a5 5 0 1 0 2 0M9 16a3 3 0 1 1-3.189-2.981l-.773 2.706a1 1 0 0 0 .688 1.236A1 1 0 0 0 6 17a1 1 0 0 0 .961-.725l.774-2.712A2.991 2.991 0 0 1 9 16m9 3a2.993 2.993 0 0 1-1-5.816V16a1 1 0 0 0 2 0v-2.816A2.993 2.993 0 0 1 18 19M6 7a1 1 0 0 1 0-2h2a1 1 0 0 1 0 2z"
            ></Path>
        </Svg>
    );
}

export { BikeIcon };
