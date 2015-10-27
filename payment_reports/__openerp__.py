# -*- coding: utf-8 -*-
##############################################################################
#
#    This module uses OpenERP, Open Source Management Solution Framework.
#    Copyright (C) 2014-Today BrowseInfo (<http://www.browseinfo.in>)
#
#    This program is free software: you can redistribute it and/or modify
#    it under the terms of the GNU General Public License as published by
#    the Free Software Foundation, either version 3 of the License, or
#    (at your option) any later version.
#
#    This program is distributed in the hope that it will be useful,
#    but WITHOUT ANY WARRANTY; without even the implied warranty of
#    MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
#    GNU General Public License for more details.
#
#    You should have received a copy of the GNU General Public License
#    along with this program.  If not, see <http://www.gnu.org/licenses/>
#
##############################################################################
{
    "name" : "Payment Reports",
    "version" : "1.0",
    "category" : "Account",
    "depends" : ['account_voucher'],
    "author": "Browseinfo",
    "description": """
        Customer and Supplier Payment reports By Browseinfo
    """,
    "website" : "www.browseinfo.in",
    "data" :[
            'payment_wizard_custom.xml',
			'views/payment_report_view.xml',
			'report/payment_report_menu.xml',
    ],
    'qweb':[
    ],
    "auto_install": False,
    "installable": True,
}
# vim:expandtab:smartindent:tabstop=4:softtabstop=4:shiftwidth=4:
