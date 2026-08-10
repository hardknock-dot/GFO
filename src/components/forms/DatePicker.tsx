import { forwardRef } from 'react';
import { Calendar } from 'lucide-react';
import { TextInput } from './TextInput';
import type { TextInputProps } from './TextInput';

export const DatePicker = forwardRef<HTMLInputElement, TextInputProps>((props, ref) => {
  return (
    <TextInput
      ref={ref}
      type="date"
      icon={<Calendar className="w-4 h-4 text-slate-400" />}
      {...props}
    />
  );
});

DatePicker.displayName = 'DatePicker';
