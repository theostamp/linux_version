import { useEffect, useRef } from 'react';

export const useResizableColumns = () => {
  const tableRef = useRef<HTMLTableElement>(null);

  useEffect(() => {
    const table = tableRef.current;
    if (!table) return;

    let isResizing = false;
    let currentTh: HTMLTableCellElement | null = null;
    let startX = 0;
    let startWidth = 0;

    const handleMouseDown = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (target.tagName === 'TH' && e.offsetX > target.offsetWidth - 5) {
        isResizing = true;
        currentTh = target as HTMLTableCellElement;
        startX = e.pageX;
        startWidth = currentTh.offsetWidth;
        
        currentTh.classList.add('resizing');
        document.body.style.cursor = 'col-resize';
        document.body.style.userSelect = 'none';
      }
    };

    const handleMouseMove = (e: MouseEvent) => {
      if (!isResizing || !currentTh) return;

      const diff = e.pageX - startX;
      const newWidth = Math.max(50, startWidth + diff); // Minimum width of 50px
      
      currentTh.style.width = `${newWidth}px`;
    };

    const handleMouseUp = () => {
      if (isResizing && currentTh) {
        currentTh.classList.remove('resizing');
        currentTh = null;
      }
      
      isResizing = false;
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
    };

    table.addEventListener('mousedown', handleMouseDown);
    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);

    return () => {
      table.removeEventListener('mousedown', handleMouseDown);
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, []);

  return tableRef;
};
