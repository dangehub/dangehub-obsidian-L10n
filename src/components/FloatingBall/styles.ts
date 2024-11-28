export const floatingBallStyles = {
    container: `
        position: fixed;
        width: 40px;
        height: 40px;
        background: var(--interactive-accent);
        border-radius: 50%;
        display: flex;
        align-items: center;
        justify-content: center;
        cursor: move;
        z-index: 1000;
        box-shadow: 0 2px 5px rgba(0, 0, 0, 0.2);
        transition: transform 0.2s ease;
        user-select: none;
    `,
    
    icon: `
        color: var(--text-on-accent);
        font-size: 20px;
        line-height: 1;
    `,

    menu: `
        position: absolute;
        top: 100%;
        left: 50%;
        transform: translateX(-50%);
        background: var(--background-primary);
        border: 1px solid var(--background-modifier-border);
        border-radius: 4px;
        padding: 5px 0;
        margin-top: 5px;
        box-shadow: 0 2px 5px rgba(0, 0, 0, 0.2);
        display: none;
    `,

    menuItem: `
        padding: 5px 10px;
        cursor: pointer;
        white-space: nowrap;
        color: var(--text-normal);
        
        &:hover {
            background: var(--background-modifier-hover);
        }
    `,

    active: `
        transform: scale(1.1);
        background: var(--interactive-accent-hover);
    `
};
