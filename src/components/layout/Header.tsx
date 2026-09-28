import Link from 'next/link'
import { CartButton } from '@/components/cart/CartButton'
import { getCommerce } from '@/lib/commerce'
import styles from './Header.module.css'

export async function Header() {
  const menu = await getCommerce().getMenu()
  return (
    <header className={styles.header}>
      <div className={`container ${styles.inner}`}>
        <Link href="/" className={styles.logo} aria-label="Fernwick Goods, home">
          Fernwick<span aria-hidden="true">·</span>Goods
        </Link>
        <nav aria-label="Primary" className={styles.nav}>
          <ul>
            {menu.map((item) => (
              <li key={item.handle}>
                <Link href={item.handle === 'all' ? '/' : `/collections/${item.handle}`}>{item.title}</Link>
              </li>
            ))}
          </ul>
        </nav>
        <CartButton />
      </div>
    </header>
  )
}
