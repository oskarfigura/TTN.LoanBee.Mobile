import { Path, Svg, SvgProps } from '../../Svg';

const ZapCircleIcon = ({ title, ...props }: SvgProps) => {
    return (
        <Svg {...props}>
            <Path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="m12 5.5-4.638 6.747c-.28.406-.42.609-.41.778a.5.5 0 0 0 .195.373c.135.102.38.102.874.102H12v5l4.638-6.747c.28-.406.42-.609.41-.778a.5.5 0 0 0-.195-.373c-.135-.102-.38-.102-.874-.102H12z"
            ></Path>
            <Path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M12 22c5.523 0 10-4.477 10-10S17.523 2 12 2 2 6.477 2 12s4.477 10 10 10"
            ></Path>
        </Svg>
    );
}

export { ZapCircleIcon };