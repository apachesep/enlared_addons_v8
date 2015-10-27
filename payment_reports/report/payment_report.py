from openerp.report import report_sxw
from openerp.osv import osv
from datetime import time,date,datetime

class payment_report(report_sxw.rml_parse):

    def __init__(self, cr, uid, name, context=None):
        super(payment_report, self).__init__(cr, uid, name, context=context)
        self.localcontext.update({
                                  'time' : time,
                                  'get_tax': self.get_tax,
                                  })
    def get_tax(self,obj):
        vat = self.pool.get('res.users').browse(self.cr,self.uid,self.uid).company_id.vat
        return vat or ''

class payment_report_template_id(osv.AbstractModel):
    _name='report.payment_reports.payment_report_template_id'
    _inherit='report.abstract_report'
    _template='payment_reports.payment_report_template_id'
    _wrapped_report_class=payment_report


# vim:expandtab:smartindent:tabstop=4:softtabstop=4:shiftwidth=4:
