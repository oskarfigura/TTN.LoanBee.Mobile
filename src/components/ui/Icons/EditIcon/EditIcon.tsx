import { Path, Svg, SvgProps } from '../../Svg';

const EditIcon = ({ title, ...props }: SvgProps) => {
    return (
        <Svg {...props}>
            <Path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M18 10l-4-4M2.5 21.5l3.384-.376c.414-.046.62-.069.814-.131a2 2 0 00.485-.234c.17-.111.317-.259.61-.553L21 7a2.828 2.828 0 10-4-4L3.794 16.206c-.294.294-.442.442-.553.611a2 2 0 00-.234.485c-.062.193-.085.4-.131.814L2.5 21.5z"
            ></Path>
        </Svg>
    );
}

export { EditIcon };