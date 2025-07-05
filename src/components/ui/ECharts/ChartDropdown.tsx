import { useMemo } from "react";
import { HStack, Text, Select, createListCollection } from "@chakra-ui/react";

interface ChartDropdownProps {
  title: string;
  options: string[];
  selectedValues: string[];
  onSelectionChange: (values: string[]) => void;
  multiple?: boolean;
  placeholder?: string;
}

export const ChartDropdown = ({ 
  title, 
  options, 
  selectedValues, 
  onSelectionChange, 
  multiple = false,
  placeholder = "Select option"
}: ChartDropdownProps) => {
  // Create the collection for the Select component
  const collection = useMemo(() => {
    return createListCollection({
      items: options.map(option => ({
        label: option,
        value: option
      }))
    });
  }, [options]);

  return (
    <HStack marginBottom={4} gap={4}>
      <Text color="white">{title}:</Text>
      <Select.Root
        multiple={multiple}
        value={selectedValues}
        onValueChange={(details) => onSelectionChange(details.value)}
        width="300px"
        collection={collection}
      >
        <Select.HiddenSelect />
        <Select.Control>
          <Select.Trigger>
            <Select.ValueText placeholder={placeholder} />
          </Select.Trigger>
          <Select.IndicatorGroup>
            <Select.Indicator />
          </Select.IndicatorGroup>
        </Select.Control>
        <Select.Positioner>
          <Select.Content>
            {collection.items.map((item) => (
              <Select.Item key={item.value} item={item}>
                {item.label}
              </Select.Item>
            ))}
          </Select.Content>
        </Select.Positioner>
      </Select.Root>
    </HStack>
  );
}; 