// Tests for Modal component
import { describe, it, expect, vi } from 'vitest';
import { render, screen, user } from '../../../test/utils';
import { Modal } from '../Modal';

describe('Modal', () => {
    it('renders when open', () => {
        render(
            <Modal isOpen={true} onClose={vi.fn()} title="Test Modal">
                <p>Modal content</p>
            </Modal>
        );

        expect(screen.getByRole('dialog')).toBeInTheDocument();
        expect(screen.getByText('Test Modal')).toBeInTheDocument();
        expect(screen.getByText('Modal content')).toBeInTheDocument();
    });

    it('does not render when closed', () => {
        render(
            <Modal isOpen={false} onClose={vi.fn()} title="Test Modal">
                <p>Modal content</p>
            </Modal>
        );

        expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    });

    it('calls onClose when close button is clicked', async () => {
        const handleClose = vi.fn();
        render(
            <Modal isOpen={true} onClose={handleClose} title="Test Modal">
                <p>Modal content</p>
            </Modal>
        );

        const closeButton = screen.getByRole('button', { name: /close/i });
        await user.click(closeButton);

        expect(handleClose).toHaveBeenCalledTimes(1);
    });

    it('calls onClose when overlay is clicked', async () => {
        const handleClose = vi.fn();
        render(
            <Modal isOpen={true} onClose={handleClose} title="Test Modal">
                <p>Modal content</p>
            </Modal>
        );

        const overlay = screen.getByTestId('modal-overlay');
        await user.click(overlay);

        expect(handleClose).toHaveBeenCalledTimes(1);
    });

    it('does not close when modal content is clicked', async () => {
        const handleClose = vi.fn();
        render(
            <Modal isOpen={true} onClose={handleClose} title="Test Modal">
                <p>Modal content</p>
            </Modal>
        );

        const content = screen.getByText('Modal content');
        await user.click(content);

        expect(handleClose).not.toHaveBeenCalled();
    });

    it('handles escape key press', async () => {
        const handleClose = vi.fn();
        render(
            <Modal isOpen={true} onClose={handleClose} title="Test Modal">
                <p>Modal content</p>
            </Modal>
        );

        await user.keyboard('{Escape}');

        expect(handleClose).toHaveBeenCalledTimes(1);
    });

    it('renders without title', () => {
        render(
            <Modal isOpen={true} onClose={vi.fn()}>
                <p>Modal content</p>
            </Modal>
        );

        expect(screen.getByRole('dialog')).toBeInTheDocument();
        expect(screen.getByText('Modal content')).toBeInTheDocument();
    });

    it('applies custom size', () => {
        render(
            <Modal isOpen={true} onClose={vi.fn()} size="lg" title="Large Modal">
                <p>Modal content</p>
            </Modal>
        );

        const modal = screen.getByRole('dialog');
        expect(modal).toHaveClass('max-w-2xl');
    });

    it('can be non-closable', async () => {
        const handleClose = vi.fn();
        render(
            <Modal isOpen={true} onClose={handleClose} closable={false} title="Non-closable Modal">
                <p>Modal content</p>
            </Modal>
        );

        // Close button should not be present
        expect(screen.queryByRole('button', { name: /close/i })).not.toBeInTheDocument();

        // Escape key should not work
        await user.keyboard('{Escape}');
        expect(handleClose).not.toHaveBeenCalled();

        // Overlay click should not work
        const overlay = screen.getByTestId('modal-overlay');
        await user.click(overlay);
        expect(handleClose).not.toHaveBeenCalled();
    });

    it('focuses the modal when opened', () => {
        render(
            <Modal isOpen={true} onClose={vi.fn()} title="Test Modal">
                <p>Modal content</p>
            </Modal>
        );

        const modal = screen.getByRole('dialog');
        expect(modal).toHaveFocus();
    });

    it('traps focus within modal', async () => {
        render(
            <Modal isOpen={true} onClose={vi.fn()} title="Test Modal">
                <button>First button</button>
                <button>Second button</button>
            </Modal>
        );

        const firstButton = screen.getByText('First button');
        const secondButton = screen.getByText('Second button');
        const closeButton = screen.getByRole('button', { name: /close/i });

        // Tab should cycle through focusable elements
        await user.tab();
        expect(closeButton).toHaveFocus();

        await user.tab();
        expect(firstButton).toHaveFocus();

        await user.tab();
        expect(secondButton).toHaveFocus();
    });

    it('restores focus when closed', () => {
        const triggerButton = document.createElement('button');
        triggerButton.textContent = 'Open Modal';
        document.body.appendChild(triggerButton);
        triggerButton.focus();

        const { rerender } = render(
            <Modal isOpen={true} onClose={vi.fn()} title="Test Modal">
                <p>Modal content</p>
            </Modal>
        );

        rerender(
            <Modal isOpen={false} onClose={vi.fn()} title="Test Modal">
                <p>Modal content</p>
            </Modal>
        );

        expect(triggerButton).toHaveFocus();

        document.body.removeChild(triggerButton);
    });
});