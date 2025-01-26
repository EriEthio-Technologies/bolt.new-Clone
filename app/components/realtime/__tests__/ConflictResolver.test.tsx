import React from 'react';
import { render, fireEvent, screen } from '@testing-library/react';
import { ConflictResolver } from '../ConflictResolver';

describe('ConflictResolver', () => {
  const mockOnResolve = jest.fn();
  const defaultProps = {
    path: 'test.ts',
    content: 'Initial content',
    onResolve: mockOnResolve
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should render conflict message and content', () => {
    render(<ConflictResolver {...defaultProps} />);

    expect(screen.getByText('Conflict Detected')).toBeInTheDocument();
    expect(screen.getByText(/changes conflict with updates/i)).toBeInTheDocument();
    expect(screen.getByDisplayValue('Initial content')).toBeInTheDocument();
  });

  it('should handle content changes', () => {
    render(<ConflictResolver {...defaultProps} />);
    
    const textarea = screen.getByDisplayValue('Initial content');
    fireEvent.change(textarea, { target: { value: 'Updated content' } });

    expect(textarea).toHaveValue('Updated content');
  });

  it('should call onResolve with updated content when resolving', () => {
    render(<ConflictResolver {...defaultProps} />);
    
    const textarea = screen.getByDisplayValue('Initial content');
    fireEvent.change(textarea, { target: { value: 'Resolved content' } });
    
    fireEvent.click(screen.getByText('Resolve Conflict'));

    expect(mockOnResolve).toHaveBeenCalledWith(
      expect.objectContaining({
        operations: expect.arrayContaining([
          expect.objectContaining({
            type: 'update',
            content: 'Resolved content'
          })
        ])
      })
    );
  });

  it('should call onResolve with empty operations when discarding', () => {
    render(<ConflictResolver {...defaultProps} />);
    
    fireEvent.click(screen.getByText('Discard Changes'));

    expect(mockOnResolve).toHaveBeenCalledWith(
      expect.objectContaining({
        operations: []
      })
    );
  });
}); 