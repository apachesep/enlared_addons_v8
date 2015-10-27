from openerp.report import report_sxw
from datetime import time,date,datetime
from openerp.osv import osv, fields


class account_invoice(osv.osv):
    _inherit = "account.invoice"

    def invoice_pay_customer(self, cr, uid, ids, context=None):
        result = super(account_invoice, self).invoice_pay_customer(cr, uid, ids, context=context)
        inv = self.pool.get('account.invoice').browse(cr, uid, ids[0], context=context)
        invoicenumber = inv.number or ''
        if invoicenumber:
            result.get('context').update({'default_invoice_number': invoicenumber})
        return result

class account_voucher(osv.osv):
    _inherit = "account.voucher"

    _columns = {
        'invoice_number': fields.char('Invoice Number'),
    }

    def print_voucher(self, cr, uid, ids, context=None):
        if context is None:
            context = {}
        data = self.read(cr, uid, ids)[0]
        voucher_obj = self.pool.get('account.voucher')
        voucher_obj.button_proforma_voucher(cr, uid, ids, context=context)
        datas = {
             'ids': context.get('active_ids',[]),
             'model': 'account.voucher',
             'form': data
                 }
        return {
            'type': 'ir.actions.report.xml',
            'report_name': 'payment_reports.payment_report_template_id',
            'datas': datas,
            }

# vim:expandtab:smartindent:tabstop=4:softtabstop=4:shiftwidth=4:
