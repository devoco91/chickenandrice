import React from "react";
import Link from "next/link";

function Footer() {
  return (
    <footer className="bg-gradient-to-br from-gray-50 via-white to-green-50 text-gray-800 border-t border-green-200 shadow-inner">
      <div className="max-w-7xl mx-auto px-6 py-14">
        {/* Main Footer Content */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-12">
          {/* Brand Section */}
          <div>
            <div className="mb-4">
              <img
                src="/lASOP_chicken___rice_logo_2_1__OK-removebg-preview.png"
                alt="Chicken & Rice Logo"
                width={100}
                height={100}
                className="object-contain drop-shadow-md"
              />
            </div>
            <p className="text-gray-700 leading-relaxed mb-4 max-w-md">
              Serving delicious, fresh, and authentic meals with love. Your satisfaction is our priority.
            </p>
            <p className="text-gray-600 text-sm italic">
              Fresh ingredients, bold flavors, fast delivery – Experience the best taste in town.
            </p>
          </div>

          {/* Contact Information */}
          <div>
            <h3 className="text-lg font-semibold bg-clip-text text-transparent bg-gradient-to-r from-green-500 to-emerald-600 mb-4">
              Contact Us
            </h3>
            <div className="space-y-4 text-gray-700">
              <div>
                <h5 className="font-medium text-black mb-1">Corporate Head Office:</h5>
                <p className="text-sm">114, Iju Road, Ifako-Ijaiye, Lagos</p>
              </div>

              {/* <div className="text-sm">
                <p className="text-gray-600">We have outlets all over Lagos</p>
                <p className="text-gray-500">Other Cities Loading...</p>
              </div> */}

              <div className="space-y-3">
                <div className="flex items-center gap-3">
                  <span className="text-green-500 text-lg">📞</span>
                  <div className="text-sm">
                    <div>0904 000 2074</div>
                    <div>0904 000 2075</div>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <span className="text-green-500 text-lg">✉️</span>
                  <Link
                    href="mailto:chickenandriceltd@gmail.com"
                    className="hover:text-green-600 hover:underline transition-colors text-sm"
                  >
                    chickenandriceltd@gmail.com
                  </Link>
                </div>
              </div>
            </div>
          </div>

          {/* Opening Hours */}
          <div>
            <h3 className="text-lg font-semibold bg-clip-text text-transparent bg-gradient-to-r from-green-500 to-emerald-600 mb-4">
              Opening Hours
            </h3>
            <div className="bg-white shadow rounded-xl p-5 border border-gray-200">
              <div className="text-gray-700 text-sm space-y-3">
                <div className="flex justify-between">
                  <span>Mon - Sat:</span>
                  <span className="font-medium">9:00 AM – 10:00 PM</span>
                </div>
                {/* <div className="flex justify-between">
                  <span>Sunday:</span>
                  <span className="font-medium">12:00 PM – 10:00 PM</span>
                </div> */}
              </div>
            </div>
          </div>
        </div>

        {/* Bottom Section */}
        <div className="border-t border-gray-200 mt-10 pt-6">
          <div className="flex flex-col md:flex-row justify-between items-center gap-4">
            <p className="text-gray-600 text-sm text-center md:text-left">
              © {new Date().getFullYear()} <span className="font-semibold text-green-600">Chicken & Rice</span>. All rights reserved.
            </p>
            <p className="text-gray-600 text-sm flex items-center gap-1 text-center md:text-right">
              Designed by{" "}
              <span className="font-medium text-green-600">Vault Software Company Limited</span>
            </p>
          </div>
        </div>
      </div>
    </footer>
  );
}

export default Footer;
