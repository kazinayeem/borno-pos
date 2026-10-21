import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Logo } from '../icons';
import '../landing.css';

const features = [
    ['Sales Management', 'Fast & easy billing with multiple payment options.', 'cart', true],
    ['Inventory Management', 'Track stock in real-time and avoid shortages.', 'boxes', false],
    ['HR Management', 'Manage your team, attendance and payroll.', 'users', false],
    ['Accounting', 'Keep your finances organized and simple.', 'invoice', false],
    ['Multiple Stores', 'Control all your branches from one dashboard.', 'shop', false],
    ['Cloud Based', 'Access your business anywhere, anytime.', 'cloud', false],
];

const solutions = [
    ['Retail Stores', 'Fashion, electronics, lifestyle & more', '/images/landing/feature/feature5.png', 'cart'],
    ['Restaurants', 'Dine-in, takeaway & online orders', '/images/landing/feature/feature1.png', 'utensils'],
    ['Inventory & Wholesale', 'Track stock & manage suppliers', '/images/landing/feature/feature3.png', 'boxes'],
    ['Super Shops', 'Grocery, pharmacy, daily needs', '/images/landing/register.png', 'basket'],
    ['Salons & Spas', 'Bookings, services & customer care', '/images/landing/feature/feature2.png', 'scissors'],
    ['Multi-Branch Business', 'Manage all branches easily', '/images/landing/about/about1.png', 'building'],
];

const reviews = [
    ['Ayesha Rahman', 'Retail Store Owner', '/images/landing/review/g1.png', 'BornoPos has made our daily operations so much easier. Inventory and sales are always in sync. Highly recommended!'],
    ['Nayeem Bhuiyan', 'Restaurant Owner', '/images/landing/review/b1.png', 'The barcode checkout and real-time reports save us a lot of time. Billing mistakes have reduced significantly.'],
    ['Sabrina Khan', 'Multi-Branch Business', '/images/landing/review/g3.png', 'I can manage all my branches from one dashboard. It is powerful, easy to use, and dependable.'],
    ['Rafiq Ahmed', 'Super Shop Owner', '/images/landing/review/b2.png', 'Makes daily operations so much easier. Accurate, efficient, and it lines up with the accounts.'],
    ['Abdullah al Mamun', 'Wholesale Distributor', '/images/landing/review/b3.png', 'This POS system has completely transformed how we manage sales and inventory. Fast, easy to use, and reliable.'],
    ['Tasnia Farin', 'Salon Owner', '/images/landing/review/b4.png', 'We have been using BornoPos for a few months and it has simplified our entire checkout process.'],
];

function Glyph({ name }) {
    const common = { fill: 'none', stroke: 'currentColor', strokeWidth: 1.8, strokeLinecap: 'round', strokeLinejoin: 'round' };
    return (
        <svg viewBox="0 0 24 24" aria-hidden="true" {...common}>
            {name === 'rocket' && <path d="M12 19c-4-1-6-5-6-9 4 0 8 2 9 6-1 1-2 2-3 3Zm0 0c1 2 1 3 0 4M9 14l-2 2M14.5 8.5l2-2" />}
            {name === 'cart' && (<><circle cx="9" cy="20" r="1" fill="currentColor" stroke="none" /><circle cx="17" cy="20" r="1" fill="currentColor" stroke="none" /><path d="M3 4h2l2.2 11h11.3l2-7H7" /></>)}
            {name === 'boxes' && <path d="M3 7.5 12 3l9 4.5M3 7.5V17l9 4 9-4V7.5M12 12v9M3 7.5l9 4.5 9-4.5" />}
            {name === 'users' && (<><path d="M16 20v-1a3 3 0 0 0-3-3H7a3 3 0 0 0-3 3v1" /><circle cx="10" cy="8" r="3" /><path d="M20 20v-1a3 3 0 0 0-2.2-2.9M16 5.1a3 3 0 0 1 0 5.8" /></>)}
            {name === 'invoice' && (<><path d="M6 3h12v18l-2-1.2L14 21l-2-1.2L10 21l-2-1.2L6 21z" /><path d="M9 8h6M9 12h6M9 16h3" /></>)}
            {name === 'shop' && (<><path d="M4 10 6 4h12l2 6" /><path d="M4 10h16v9H4z" /><path d="M9 19v-5h6v5" /></>)}
            {name === 'cloud' && <path d="M7 18h10a4 4 0 0 0 .4-8 6 6 0 0 0-11.5-1.5A3.5 3.5 0 0 0 7 18Z" />}
            {name === 'utensils' && (<><path d="M6 3v8a2 2 0 0 0 2 2h0V3M8 13v8M6 3v4M10 3v4" /><path d="M17 3c-1.5 2-2 4-2 6a3 3 0 0 0 6 0c0-2-.5-4-2-6v18" /></>)}
            {name === 'basket' && (<><path d="M5 9h14l-1.2 10H6.2z" /><path d="M8 9 9.5 4h5L16 9M9 13v4M12 13v4M15 13v4" /></>)}
            {name === 'scissors' && (<><circle cx="6" cy="6" r="2.5" /><circle cx="6" cy="18" r="2.5" /><path d="M8.2 7.5 20 18M8.2 16.5 20 6" /></>)}
            {name === 'building' && (<><path d="M4 21V5h10v16M14 9h6v12" /><path d="M7 8h2M7 12h2M7 16h2M17 13h2M17 17h2" /></>)}
            {name === 'play' && <path d="M9 7.5v9l8-4.5-8-4.5Z" fill="currentColor" stroke="none" />}
            {name === 'arrow' && <path d="M5 12h14M13 6l6 6-6 6" />}
            {name === 'chevron-left' && <path d="m14 6-6 6 6 6" />}
            {name === 'chevron-right' && <path d="m10 6 6 6-6 6" />}
            {name === 'up' && <path d="M12 19V5M6 11l6-6 6 6" />}
            {name === 'menu' && <path d="M4 7h16M4 12h16M4 17h16" />}
            {name === 'phone' && <path d="M8 3h3l1.5 4-2 1.2a12 12 0 0 0 5.3 5.3L17 12l4 1.5V17a2 2 0 0 1-2.2 2A16 16 0 0 1 5 6.2 2 2 0 0 1 7 4Z" />}
            {name === 'mail' && (<><rect x="3" y="5" width="18" height="14" rx="2" /><path d="m4 7 8 6 8-6" /></>)}
            {name === 'pin' && (<><path d="M12 21s7-6.2 7-11a7 7 0 1 0-14 0c0 4.8 7 11 7 11Z" /><circle cx="12" cy="10" r="2.2" /></>)}
            {name === 'quote' && <path d="M8 17c-2 0-3-1.4-3-3.2V8h4v4H7.4c.2 1.2.8 2 2 2.2V17Zm9 0c-2 0-3-1.4-3-3.2V8h4v4h-1.6c.2 1.2.8 2 2 2.2V17Z" fill="currentColor" stroke="none" />}
        </svg>
    );
}

export default function Landing() {
    const [open, setOpen] = useState(false);
    const [scrolled, setScrolled] = useState(false);
    const [showTop, setShowTop] = useState(false);
    const [active, setActive] = useState('home');
    const [slide, setSlide] = useState(0);
    const [per, setPer] = useState(3);
    const phone = window.BornoPos?.phone || '';
    const email = window.BornoPos?.email || '';

    useEffect(() => {
        const previous = document.title;
        document.title = 'BornoPos — Manage Your Business Easier & Smarter';
        const font = document.createElement('link');
        font.rel = 'stylesheet';
        font.href = 'https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap';
        document.head.appendChild(font);
        return () => {
            document.title = previous;
            font.remove();
        };
    }, []);

    useEffect(() => {
        const sections = ['home', 'features', 'solutions', 'reviews'];
        function onScroll() {
            const y = window.scrollY;
            setScrolled(y > 10);
            setShowTop(y > 600);
            let current = 'home';
            sections.forEach((id) => {
                const node = document.getElementById(id);
                if (node && node.offsetTop <= y + 120) current = id;
            });
            setActive(current);
        }
        onScroll();
        window.addEventListener('scroll', onScroll, { passive: true });
        return () => window.removeEventListener('scroll', onScroll);
    }, []);

    useEffect(() => {
        const nodes = document.querySelectorAll('.lp-page .reveal');
        if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
            nodes.forEach((node) => node.classList.add('is-visible'));
            return undefined;
        }
        const observer = new IntersectionObserver((entries) => {
            entries.forEach((entry) => {
                if (!entry.isIntersecting) return;
                entry.target.classList.add('is-visible');
                observer.unobserve(entry.target);
            });
        }, { threshold: 0.12 });
        nodes.forEach((node) => observer.observe(node));
        return () => observer.disconnect();
    }, []);

    useEffect(() => {
        function measure() {
            const width = window.innerWidth;
            setPer(width < 640 ? 1 : width < 992 ? 2 : 3);
        }
        measure();
        window.addEventListener('resize', measure);
        return () => window.removeEventListener('resize', measure);
    }, []);

    useEffect(() => {
        const max = Math.max(0, reviews.length - per);
        if (slide > max) setSlide(max);
    }, [per, slide]);

    useEffect(() => {
        if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return undefined;
        const timer = window.setInterval(() => {
            setSlide((current) => (current >= reviews.length - per ? 0 : current + 1));
        }, 6000);
        return () => window.clearInterval(timer);
    }, [per]);

    function go(next) {
        const max = Math.max(0, reviews.length - per);
        setSlide(Math.min(max, Math.max(0, next)));
    }

    return (
        <div className="lp-page">
            <header className={`lp-header ${scrolled ? 'is-scrolled' : ''}`}>
                <div className="lp-container">
                    <nav className={`lp-nav ${open ? 'is-open' : ''}`} aria-label="Primary">
                        <Link className="lp-brand" to="/" onClick={() => setOpen(false)}>
                            <Logo />
                            <span><strong>BornoPos</strong><small>Powering Your Business</small></span>
                        </Link>
                        <button className="lp-toggler" type="button" aria-expanded={open} aria-label="Menu" onClick={() => setOpen((value) => !value)}>
                            <Glyph name="menu" />
                        </button>
                        <ul className="lp-links">
                            <li><a className={active === 'home' ? 'active' : ''} href="#home" onClick={() => setOpen(false)}>Home</a></li>
                            <li><a className={active === 'features' ? 'active' : ''} href="#features" onClick={() => setOpen(false)}>Features</a></li>
                            <li><a className={active === 'solutions' ? 'active' : ''} href="#solutions" onClick={() => setOpen(false)}>Solutions</a></li>
                            <li><a className={active === 'reviews' ? 'active' : ''} href="#reviews" onClick={() => setOpen(false)}>Reviews</a></li>
                        </ul>
                        <div className="lp-actions">
                            <Link className="lp-btn lp-btn-outline" to="/signin">Login</Link>
                            <a className="lp-btn lp-btn-primary" href="/signup">Get Started <Glyph name="arrow" /></a>
                        </div>
                    </nav>
                </div>
            </header>

            <section className="lp-hero" id="home">
                <div className="lp-container">
                    <div className="lp-hero-row">
                        <div className="lp-hero-copy">
                            <span className="lp-badge"><span className="lp-badge-ico"><Glyph name="rocket" /></span> Smart POS Solution</span>
                            <h1>Manage Your Business <span className="accent">Easier & Smarter</span></h1>
                            <p className="lp-lead">BornoPos is an all-in-one solution for managing sales, inventory, HR, and accounting. It is designed to handle multiple stores, real-time tracking, and employee management with ease.</p>
                            <div className="lp-hero-actions">
                                <a className="lp-btn lp-btn-primary" href="/signup">Start Free Demo <span className="lp-arrow"><Glyph name="arrow" /></span></a>
                                <a className="lp-btn lp-btn-dark" href="#features"><Glyph name="play" /> Watch Video</a>
                            </div>
                        </div>
                        <div className="lp-hero-visual">
                            <span className="lp-blob is-1" />
                            <span className="lp-blob is-2" />
                            <div className="lp-mockup-wrap">
                                <img className="lp-mockup" src="/images/landing/hero-mockup.png" alt="BornoPos on a laptop, tablet, and phone" width="1509" height="1003" />
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            <section className="lp-section" id="features">
                <div className="lp-container">
                    <div className="lp-section-head reveal">
                        <span className="lp-eyebrow">Why Choose BornoPos</span>
                        <h2>Everything You Need <span className="accent">in One Place</span></h2>
                        <p>From sales to inventory, HR to accounting — manage the whole shop from one point-of-sale workspace.</p>
                    </div>
                    <div className="lp-feature-grid">
                        {features.map(([title, text, icon, solid], index) => (
                            <article className={`lp-feature lp-tone-${index} reveal`} style={{ '--d': `${index * 0.08}s` }} key={title}>
                                <span className={`lp-icon ${solid ? 'is-solid' : ''}`}><Glyph name={icon} /></span>
                                <h4>{title}</h4>
                                <p>{text}</p>
                            </article>
                        ))}
                    </div>
                </div>
            </section>

            <section className="lp-section lp-solutions" id="solutions">
                <span className="lp-blob is-3" />
                <div className="lp-container">
                    <div className="lp-solutions-row">
                        <div className="reveal from-left">
                            <span className="lp-eyebrow is-caps">For Every Business</span>
                            <h2>Built for Different <span className="accent">Types of Stores</span></h2>
                            <p>Whether you run a retail shop, a restaurant, or a multi-branch business, BornoPos fits the counter you already have.</p>
                            <a className="lp-btn lp-btn-primary" href="/signup">Explore All Industries <Glyph name="arrow" /></a>
                        </div>
                        <div className="lp-solution-grid">
                            {solutions.map(([title, text, image, icon], index) => (
                                <a className="lp-solution reveal" style={{ '--d': `${index * 0.08}s` }} href="/signup" key={title}>
                                    <div className="lp-solution-media"><img src={image} alt="" /></div>
                                    <div className="lp-solution-body">
                                        <span className="lp-solution-icon"><Glyph name={icon} /></span>
                                        <div>
                                            <h5>{title}</h5>
                                            <p>{text}</p>
                                        </div>
                                        <span className="lp-solution-go"><Glyph name="arrow" /></span>
                                    </div>
                                </a>
                            ))}
                        </div>
                    </div>
                </div>
            </section>

            <section className="lp-section lp-reviews" id="reviews">
                <div className="lp-container">
                    <div className="lp-section-head reveal">
                        <span className="lp-eyebrow">What Our Customers Say</span>
                        <h2>Trusted by thousands of <span className="accent">business owners</span></h2>
                        <p>Shops use BornoPos to keep the counter, the stock, and the accounts on the same records.</p>
                    </div>
                    <div className="lp-slider-wrap reveal">
                        <button className="lp-arrow-btn prev" type="button" aria-label="Previous reviews" onClick={() => go(slide - 1)}><Glyph name="chevron-left" /></button>
                        <div className="lp-slider">
                            <div
                                className="lp-track"
                                style={{ width: `calc(100% * ${reviews.length} / ${per})`, transform: `translateX(calc(${slide} * -100% / ${reviews.length}))` }}
                            >
                                {reviews.map(([name, role, image, quote]) => (
                                    <div className="lp-slide" style={{ '--count': reviews.length }} key={name}>
                                        <article className="lp-review">
                                            <span className="lp-quote"><Glyph name="quote" /></span>
                                            <div className="lp-review-head">
                                                <img src={image} alt="" width="50" height="50" />
                                                <div>
                                                    <h5>{name}</h5>
                                                    <div className="lp-review-role">{role}</div>
                                                    <div className="lp-stars" aria-label="5 stars">★★★★★</div>
                                                </div>
                                            </div>
                                            <blockquote>“{quote}”</blockquote>
                                        </article>
                                    </div>
                                ))}
                            </div>
                        </div>
                        <button className="lp-arrow-btn next" type="button" aria-label="Next reviews" onClick={() => go(slide + 1)}><Glyph name="chevron-right" /></button>
                        <div className="lp-dots">
                            {reviews.map(([name], index) => (
                                <button className={index === slide ? 'on' : ''} type="button" aria-label={`Review ${index + 1}`} key={name} onClick={() => go(index)} />
                            ))}
                        </div>
                    </div>
                </div>
            </section>

            <section className="lp-section" id="get-started" style={{ paddingTop: 0 }}>
                <div className="lp-container">
                    <div className="lp-cta reveal">
                        <span className="lp-cta-dots" />
                        <div className="lp-cta-row">
                            <div>
                                <span className="lp-eyebrow is-caps">Ready to grow your business?</span>
                                <h2>Get Started with BornoPos Today</h2>
                                <p>Open a shop and run sales, stock, and accounts from one workspace.</p>
                            </div>
                            <a className="lp-btn lp-btn-light" href="/signup">Start Free Demo <Glyph name="arrow" /></a>
                        </div>
                    </div>
                </div>
            </section>

            <footer className="lp-footer" id="about">
                <div className="lp-container">
                    <div className="lp-footer-grid">
                        <div>
                            <Link className="lp-brand" to="/"><Logo /><span><strong>BornoPos</strong><small>Powering Your Business</small></span></Link>
                            <p style={{ marginTop: 14 }}>BornoPos is a point-of-sale and shop workspace for sales, inventory, people, and accounts. Version {window.BornoPos?.version || '1.0.0'}.</p>
                        </div>
                        <div>
                            <h6>Quick Links</h6>
                            <ul>
                                <li><a href="#home">Home</a></li>
                                <li><a href="#features">Features</a></li>
                                <li><a href="#solutions">Solutions</a></li>
                                <li><a href="#reviews">Reviews</a></li>
                                <li><Link to="/signin">Login</Link></li>
                            </ul>
                        </div>
                        <div>
                            <h6>Resources</h6>
                            <ul>
                                <li><a href="/signup">Create a shop</a></li>
                                <li><Link to="/signin">Demo access</Link></li>
                                <li><a href={`mailto:${email}`}>Get Support</a></li>
                            </ul>
                        </div>
                        <div>
                            <h6>Contact Information</h6>
                            <ul className="lp-contact">
                                <li><Glyph name="phone" /> <a href={`tel:${phone.replace(/\s/g, '')}`}>{phone}</a></li>
                                <li><Glyph name="mail" /> <a href={`mailto:${email}`}>{email}</a></li>
                            </ul>
                        </div>
                    </div>
                    <div className="lp-footer-bottom">
                        <span>© {new Date().getFullYear()} BornoPos. All rights reserved.</span>
                    </div>
                </div>
            </footer>
            <button className={`lp-top ${showTop ? 'is-visible' : ''}`} type="button" aria-label="Back to top" onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}>
                <Glyph name="up" />
            </button>
        </div>
    );
}
