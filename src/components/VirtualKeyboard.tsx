interface VirtualKeyboardProps {
  value: string;
  onChange: (value: string) => void;
  onClose: () => void;
}

export default function VirtualKeyboard({ value, onChange, onClose }: VirtualKeyboardProps) {
  const handleKeyPress = (key: string) => {
    if (key === 'backspace') {
      onChange(value.slice(0, -1));
    } else if (key === 'clear') {
      onChange('');
    } else if (key === 'enter') {
      onClose();
    } else {
      onChange(value + key);
    }
  };

  const numberKeys = [
    ['1', '2', '3'],
    ['4', '5', '6'],
    ['7', '8', '9'],
  ];

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-end justify-center z-50 p-4">
      <div className="bg-gray-800 rounded-t-2xl w-full max-w-md p-6">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-xl font-bold">輸入會編</h3>
          <button
            onClick={onClose}
            className="px-4 py-2 bg-white hover:bg-gray-100 text-black rounded-lg border-2 border-white transition-all duration-200"
          >
            完成
          </button>
        </div>
        
        <div className="mb-4">
          <div className="bg-gray-900 p-4 rounded-lg text-2xl font-mono text-center min-h-[60px] flex items-center justify-center">
            {value || <span className="text-gray-500">請輸入會編（數字）</span>}
          </div>
        </div>

        <div className="grid grid-cols-3 gap-3 mb-3">
          {numberKeys.map((row) =>
            row.map((key) => (
              <button
                key={key}
                onClick={() => handleKeyPress(key)}
                className="py-4 bg-white hover:bg-gray-100 active:bg-gray-200 rounded-lg text-xl font-semibold text-black border-2 border-white transition-all duration-200"
              >
                {key}
              </button>
            ))
          )}
        </div>
        <div className="grid grid-cols-3 gap-3 mb-3">
          <div className="col-span-1"></div>
          <button
            onClick={() => handleKeyPress('0')}
            className="py-4 bg-white hover:bg-gray-100 active:bg-gray-200 rounded-lg text-xl font-semibold text-black border-2 border-white transition-all duration-200"
          >
            0
          </button>
          <div className="col-span-1"></div>
        </div>

        <div className="grid grid-cols-3 gap-3">
          <button
            onClick={() => handleKeyPress('backspace')}
            className="py-4 bg-white hover:bg-gray-100 active:bg-gray-200 rounded-lg text-lg font-semibold text-black border-2 border-white transition-all duration-200"
          >
            ← 刪除
          </button>
          <button
            onClick={() => handleKeyPress('clear')}
            className="py-4 bg-white hover:bg-gray-100 active:bg-gray-200 rounded-lg text-lg font-semibold text-black border-2 border-white transition-all duration-200"
          >
            清除
          </button>
          <button
            onClick={() => handleKeyPress('enter')}
            className="py-4 bg-white hover:bg-gray-100 active:bg-gray-200 rounded-lg text-lg font-semibold text-black border-2 border-white transition-all duration-200"
          >
            確認
          </button>
        </div>
      </div>
    </div>
  );
}
