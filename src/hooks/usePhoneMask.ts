
import { useState } from 'react';

export const usePhoneMask = (initialValue: string = '') => {
  const [value, setValue] = useState(initialValue);

  const applyMask = (input: string) => {
    // Remove todos os caracteres não numéricos
    const numbers = input.replace(/\D/g, '');
    
    // Aplica a máscara (XX) XXXXX-XXXX
    if (numbers.length <= 11) {
      return numbers
        .replace(/(\d{2})(\d)/, '($1) $2')
        .replace(/(\d{5})(\d)/, '$1-$2');
    }
    
    return value; // Retorna o valor anterior se exceder 11 dígitos
  };

  const handleChange = (input: string) => {
    const masked = applyMask(input);
    setValue(masked);
    return masked;
  };

  return {
    value,
    setValue,
    handleChange,
    applyMask
  };
};
