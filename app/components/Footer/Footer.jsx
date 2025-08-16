import React from 'react';
import Link from 'next/link';

function Footer() {
  return (
    <footer className='bg-white text-black'>
      <div className='max-w-7xl mx-auto px-4 py-12'>
        {/* Main Footer Content */}
        <div className='grid grid-cols-1 md:grid-cols-3 gap-8'>
          
          {/* Brand Section */}
          <div>
            <div className='mb-4'>
              <img 
                src="/lASOP_chicken___rice_logo_2_1__OK-removebg-preview.png"
                alt="Chicken & Rice Logo"
                width={80}
                height={80}
                className='object-contain'
              />
            </div>
            <p className='text-gray-700 text-base mb-4 max-w-md'>
              Serving delicious, fresh, and authentic meals with love. Your satisfaction is our priority.
            </p>
            <p className='text-gray-600 text-sm'>
              Fresh ingredients, bold flavors, fast delivery - Experience the best taste in town
            </p>
          </div>

          {/* Contact Information */}
          <div>
            <h3 className='text-lg font-semibold text-green-400 mb-4'>Contact Us</h3>
            <div className='space-y-3 text-gray-700'>
              <div>
                <h5 className='font-medium text-black mb-1'>Corporate Head Office:</h5>
                <p className='text-sm'>114, Iju Road, Ifako-Ijaiye, Lagos</p>
              </div>
              
              <div className='text-sm'>
                <p className='text-gray-600'>We have outlets all over Lagos</p>
                <p className='text-gray-500'>Other Cities Loading...</p>
              </div>
              
              <div className='space-y-2'>
                <div className='flex items-center gap-2'>
                  <span className='text-green-400'>📞</span>
                  <div className='text-sm'>
                    <div>0904 000 2074</div>
                    <div>0904 000 2075</div>
                  </div>
                </div>
                
                <div className='flex items-center gap-2'>
                  <span className='text-green-400'>✉️</span>
                  <Link href='' className=''>
                  @mychickenandrice
                  </Link>
                </div>
              </div>
            </div>
          </div>

          {/* Opening Hours */}
          <div>
            <h3 className='text-lg font-semibold text-green-400 mb-4'>Opening Hours</h3>
            <div className='bg-gray-100 rounded-lg p-4'>
              <div className='text-gray-700 text-sm space-y-2'>
                <div className='flex justify-between'>
                  <span>Mon - Sat:</span>
                  <span>9:00 AM - 10:00 PM</span>
                </div>
                <div className='flex justify-between'>
                  <span>Sundays:</span>
                  <span>12:00pm - 10:00 PM</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Bottom Section */}
        <div className='border-t border-gray-300 mt-8 pt-6'>
          <div className='flex flex-col md:flex-row justify-between items-center gap-4'>
            <div className='text-center md:text-left'>
              <p className='text-gray-600 text-sm'>
                © {new Date().getFullYear()} Chicken & Rice. All rights reserved.
              </p>
            </div>
            
            <div className='text-center md:text-right'>
              <p className='text-gray-600 text-sm flex items-center justify-center gap-1'>
                Designed by Vault software company limited
              </p>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
}

export default Footer;