import './Header.css'
import chefLogo from './Images/pngtree-chef-icon-png-image_6385989.png'
export default function Header()
{
    return(
        <div className='Header'>
    <img src={chefLogo} alt='CookByte Logo'/>
    <div className="Header-brand">
        <h1 className='CookByte'>CookByte</h1>
        <p className="Header-caption">Turning kitchen ingredients into culinary code</p>
    </div>
    </div>
    )
}
