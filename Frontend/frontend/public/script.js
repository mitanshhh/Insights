// script.js - Interactive logic for AI Security Chatbot

document.addEventListener('DOMContentLoaded', () => {

    // 2. Scroll Reveal Animation using IntersectionObserver
    const revealElements = document.querySelectorAll('.reveal');

    const revealObserver = new IntersectionObserver((entries, observer) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.classList.add('active');
                // Optional: Unobserve if we only want it to animate once
                // observer.unobserve(entry.target);
            } else {
                // If we want it to animate out when scrolling away
                // entry.target.classList.remove('active');
            }
        });
    }, {
        root: null,
        rootMargin: '0px 0px -10% 0px', // Trigger slightly before the element comes into view
        threshold: 0.1
    });

    revealElements.forEach(el => {
        revealObserver.observe(el);
    });

    // 3. Network Grid Simulation (Digital Twin)
    const gridContainer = document.getElementById('network-grid');
    
    if (gridContainer) {
        const rows = 10;
        const cols = 20;
        const totalNodes = rows * cols;
        const chars = ['+', '-', '0', '1', '\\', '/', '|', '*', ':', '.'];

        // Populate grid
        for (let i = 0; i < totalNodes; i++) {
            const node = document.createElement('div');
            node.classList.add('node');
            // Random character
            node.innerText = chars[Math.floor(Math.random() * chars.length)];
            gridContainer.appendChild(node);
        }

        const nodes = document.querySelectorAll('.node');

        // Animation function for pre-emptive strike pulses
        function pulseNetwork() {
            setTimeout(() => {
                // Remove active from all
                nodes.forEach(n => n.classList.remove('active'));

                // Pick a random hot spot
                const centerCol = Math.floor(Math.random() * cols);
                const centerRow = Math.floor(Math.random() * rows);

                // Activate cluster
                nodes.forEach((node, index) => {
                    const row = Math.floor(index / cols);
                    const col = index % cols;

                    // Calculate distance from center (Manhattan distance for simpler diamond pattern)
                    const dist = Math.abs(row - centerRow) + Math.abs(col - centerCol);

                    if (dist < 4) {
                        // Change character to indicate anomaly occasionally
                        if (Math.random() > 0.7) {
                            node.innerText = ['X', '!', '#', '^'][Math.floor(Math.random() * 4)];
                        }
                        
                        setTimeout(() => {
                            node.classList.add('active');
                        }, dist * 100); // Ripple effect
                    } else {
                        // Reset other nodes to base chars randomly
                        if (Math.random() > 0.95) {
                            node.innerText = chars[Math.floor(Math.random() * chars.length)];
                        }
                    }
                });

                // Schedule next pulse
                pulseNetwork();

            }, 2000 + Math.random() * 2000); // Random pulse every 2-4 seconds
        }

        // Delay initial pulse
        setTimeout(pulseNetwork, 1000);
    }
});
