import { motion, useInView } from 'motion/react';
import { useRef, type ReactNode } from 'react';
import { cn } from '@/lib/cn';

/**
 * Cinematic text reveal: each word rises out of a mask with a slight 3D tilt.
 * Children may mix strings and elements; elements are revealed as a single unit.
 */
export function SplitText({
  children,
  className,
  delay = 0,
  stagger = 0.055,
  as: Tag = 'span',
  play = true,
  once = true,
}: {
  children: ReactNode;
  className?: string;
  delay?: number;
  stagger?: number;
  as?: 'span' | 'h1' | 'h2' | 'h3' | 'p';
  play?: boolean;
  once?: boolean;
}) {
  const ref = useRef<HTMLSpanElement>(null);
  const inView = useInView(ref, { once, margin: '-8% 0px' });
  const show = play && inView;
  const parts: ReactNode[] = [];
  const list = Array.isArray(children) ? children : [children];
  let i = 0;
  const push = (node: ReactNode, key: string) => {
    const d = delay + i * stagger;
    i++;
    parts.push(
      <span key={key} className="inline-block overflow-hidden align-bottom pb-[0.08em] -mb-[0.08em]" style={{ perspective: 600 }}>
        <motion.span
          className="inline-block will-change-transform"
          initial={{ y: '110%', rotateX: -55, opacity: 0 }}
          animate={show ? { y: '0%', rotateX: 0, opacity: 1 } : { y: '110%', rotateX: -55, opacity: 0 }}
          transition={{ duration: 1.05, delay: d, ease: [0.16, 1, 0.3, 1] }}
          style={{ transformOrigin: '50% 100%' }}
        >
          {node}
        </motion.span>
      </span>,
    );
  };
  list.forEach((node, n) => {
    if (typeof node === 'string') {
      node.split(/(\s+)/).forEach((w, k) => {
        if (!w) return;
        if (/^\s+$/.test(w)) parts.push(w.includes('\n') ? <br key={`br-${n}-${k}`} /> : ' ');
        else push(w, `w-${n}-${k}`);
      });
    } else push(node, `n-${n}`);
  });
  const Comp = Tag as 'span';
  return (
    <Comp ref={ref} className={cn(className)}>
      {parts}
    </Comp>
  );
}
