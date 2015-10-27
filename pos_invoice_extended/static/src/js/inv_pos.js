function pos_invoice(instance, module) { //module is instance.point_of_sale
    var module = instance.point_of_sale;
    var QWeb = instance.web.qweb;
    _t = instance.web._t;

    var invoice_number = null;

    var Ordersuper = module.Order;
    module.Order = module.Order.extend({
        initialize: function(attributes){
        	var res = Ordersuper.prototype.initialize.call(this, attributes);
        	this.pos = attributes.pos; 
        	this.uid =  this.generateUniqueId();
            //condition check for if start session new than it render rendom customer.
            if ( this.pos.pos_session.client_session ){
                var False = false;
                data = eval('(' +this.pos.pos_session.client_session+')');
                this.set({
                    client: data,
                });
            }else{
            	this.set({
            		client: this.pos.partners[0],
            	});
            }
            return res;
        },
        set_client: function(client){
            data = {'client_session':client}
            var ids = this.pos.pos_session.id;
            //on change customer write that customer for login session.
            (new instance.web.Model('pos.session')).call('write',[ids,data], {})
            .done(function(){
                console.log('Complete');
            });
            this.set('client',client);
        },
    });

    module.ReceiptScreenWidget = module.ScreenWidget.extend({
        template: 'ReceiptScreenWidget',

        show_numpad:     false,
        show_leftpane:   false,

        show: function(){
            this._super();
            var self = this;

            var print_button = this.add_action_button({
                    label: _t('Print'),
                    icon: '/point_of_sale/static/src/img/icons/png48/printer.png',
                    click: function(){ self.print(); },
                });

            var finish_button = this.add_action_button({
                    label: _t('Next Order'),
                    icon: '/point_of_sale/static/src/img/icons/png48/go-next.png',
                    click: function() { self.finishOrder(); },
                });

            this.refresh();

            finish_button.set_disabled(true);   
            setTimeout(function(){
                finish_button.set_disabled(false);
            }, 2000);
        },
        print: function() {
            this.pos.get('selectedOrder')._printed = true;
            window.print();
        },
        finishOrder: function() {
            this.pos.get('selectedOrder').destroy();
        },
        refresh: function() {
            var order = this.pos.get('selectedOrder');
            var thisr = this;
            (new instance.web.Model('pos.session')).call('get_invoice',[invoice_number], {})
                .done(function(value){
                    $('.pos-receipt-container', thisr.$el).html(QWeb.render('PosTicket',{
                        widget:thisr,
                        order: order,
                        inv: value,
                        orderlines: order.get('orderLines').models,
                        paymentlines: order.get('paymentLines').models,
                    }));
                });

            if (!this.pos.get('selectedOrder')._printed) {
                setTimeout(function(){
                    this.print();
                }, 1000);
                
            }
        },
        close: function(){
            this._super();
        }
    });


    module.PaymentScreenWidget = module.ScreenWidget.extend({
        template: 'PaymentScreenWidget',
        back_screen: 'products',
        next_screen: 'receipt',
        init: function(parent, options) {
            var self = this;
            this._super(parent,options);

            this.pos.bind('change:selectedOrder',function(){
                    this.bind_events();
                    this.renderElement();
                },this);

            this.bind_events();
            this.decimal_point = instance.web._t.database.parameters.decimal_point;

            this.line_delete_handler = function(event){
                var node = this;
                while(node && !node.classList.contains('paymentline')){
                    node = node.parentNode;
                }
                if(node){
                    self.pos.get('selectedOrder').removePaymentline(node.line)   
                }
                event.stopPropagation();
            };

            this.line_change_handler = function(event){
                var node = this;
                while(node && !node.classList.contains('paymentline')){
                    node = node.parentNode;
                }
                if(node){
                    var amount;
                    try{
                        amount = instance.web.parse_value(this.value, {type: "float"});
                    }
                    catch(e){
                        amount = 0;
                    }
                    node.line.set_amount(amount);
                }
            };

            this.line_click_handler = function(event){
                var node = this;
                while(node && !node.classList.contains('paymentline')){
                    node = node.parentNode;
                }
                if(node){
                    self.pos.get('selectedOrder').selectPaymentline(node.line);
                }
            };

            this.hotkey_handler = function(event){
                if(event.which === 13){
                    self.validate_order();
                }else if(event.which === 27){
                    self.back();
                }
            };

        },
        show: function(){
            this._super();
            var self = this;
            
            this.enable_numpad();
            this.focus_selected_line();
            
            document.body.addEventListener('keyup', this.hotkey_handler);

            this.add_action_button({
                    label: _t('Back'),
                    icon: '/point_of_sale/static/src/img/icons/png48/go-previous.png',
                    click: function(){  
                        self.back();
                    },
                });

            // this.add_action_button({
            //         label: _t('Validate'),
            //         name: 'validation',
            //         icon: '/point_of_sale/static/src/img/icons/png48/validate.png',
            //         click: function(){
            //             self.validate_order();
            //         },
            //     });
           
            if( this.pos.config.iface_invoicing ){
                this.add_action_button({
                        label: _t('Invoice'),
                        name: 'invoice',
                        icon: '/point_of_sale/static/src/img/icons/png48/invoice.png',
                        click: function(){
                            self.validate_order({invoice: true});
                        },
                    });
            }

            if( this.pos.config.iface_cashdrawer ){
                this.add_action_button({
                        label: _t('Cash'),
                        name: 'cashbox',
                        icon: '/point_of_sale/static/src/img/open-cashbox.png',
                        click: function(){
                            self.pos.proxy.open_cashbox();
                        },
                    });
            }

            this.update_payment_summary();
        },
        close: function(){
            this._super();
            this.disable_numpad();
            document.body.removeEventListener('keyup',this.hotkey_handler);
        },
        remove_empty_lines: function(){
            var order = this.pos.get('selectedOrder');
            var lines = order.get('paymentLines').models.slice(0);
            for(var i = 0; i < lines.length; i++){ 
                var line = lines[i];
                if(line.get_amount() === 0){
                    order.removePaymentline(line);
                }
            }
        },
        back: function() {
            this.remove_empty_lines();
            this.pos_widget.screen_selector.set_current_screen(this.back_screen);
        },
        bind_events: function() {
            if(this.old_order){
                this.old_order.unbind(null,null,this);
            }
            var order = this.pos.get('selectedOrder');
                order.bind('change:selected_paymentline',this.focus_selected_line,this);

            this.old_order = order;

            if(this.old_paymentlines){
                this.old_paymentlines.unbind(null,null,this);
            }
            var paymentlines = order.get('paymentLines');
                paymentlines.bind('add', this.add_paymentline, this);
                paymentlines.bind('change:selected', this.rerender_paymentline, this);
                paymentlines.bind('change:amount', function(line){
                        if(!line.selected && line.node){
                            line.node.value = line.amount.toFixed(this.pos.currency.decimals);
                        }
                        this.update_payment_summary();
                    },this);
                paymentlines.bind('remove', this.remove_paymentline, this);
                paymentlines.bind('all', this.update_payment_summary, this);

            this.old_paymentlines = paymentlines;

            if(this.old_orderlines){
                this.old_orderlines.unbind(null,null,this);
            }
            var orderlines = order.get('orderLines');
                orderlines.bind('all', this.update_payment_summary, this);

            this.old_orderlines = orderlines;
        },
        focus_selected_line: function(){
            var line = this.pos.get('selectedOrder').selected_paymentline;
            if(line){
                var input = line.node.querySelector('input');
                if(!input){
                    return;
                }
                var value = input.value;
                input.focus();

                if(this.numpad_state){
                    this.numpad_state.reset();
                }

                if(Number(value) === 0){
                    input.value = '';
                }else{
                    input.value = value;
                    input.select();
                }
            }
        },
        add_paymentline: function(line) {
            var list_container = this.el.querySelector('.payment-lines');
                list_container.appendChild(this.render_paymentline(line));
            
            if(this.numpad_state){
                this.numpad_state.reset();
            }
        },
        render_paymentline: function(line){
            var el_html  = openerp.qweb.render('Paymentline',{widget: this, line: line});
                el_html  = _.str.trim(el_html);

            var el_node  = document.createElement('tbody');
                el_node.innerHTML = el_html;
                el_node = el_node.childNodes[0];
                el_node.line = line;
                el_node.querySelector('.paymentline-delete')
                    .addEventListener('click', this.line_delete_handler);
                el_node.addEventListener('click', this.line_click_handler);
                el_node.querySelector('input')
                    .addEventListener('keyup', this.line_change_handler);

            line.node = el_node;

            return el_node;
        },
        rerender_paymentline: function(line){
            var old_node = line.node;
            var new_node = this.render_paymentline(line);
            
            old_node.parentNode.replaceChild(new_node,old_node);
        },
        remove_paymentline: function(line){
            line.node.parentNode.removeChild(line.node);
            line.node = undefined;
        },
        renderElement: function(){
            this._super();

            var paymentlines   = this.pos.get('selectedOrder').get('paymentLines').models;
            var list_container = this.el.querySelector('.payment-lines');

            for(var i = 0; i < paymentlines.length; i++){
                list_container.appendChild(this.render_paymentline(paymentlines[i]));
            }
            
            this.update_payment_summary();
        },
        update_payment_summary: function() {
            var currentOrder = this.pos.get('selectedOrder');
            var paidTotal = currentOrder.getPaidTotal();
            var dueTotal = currentOrder.getTotalTaxIncluded();
            var remaining = dueTotal > paidTotal ? dueTotal - paidTotal : 0;
            var change = paidTotal > dueTotal ? paidTotal - dueTotal : 0;

            this.$('.payment-due-total').html(this.format_currency(dueTotal));
            this.$('.payment-paid-total').html(this.format_currency(paidTotal));
            this.$('.payment-remaining').html(this.format_currency(remaining));
            this.$('.payment-change').html(this.format_currency(change));
            if(currentOrder.selected_orderline === undefined){
                remaining = 1;  // What is this ? 
            }
                
            if(this.pos_widget.action_bar){
                this.pos_widget.action_bar.set_button_disabled('validation', !this.is_paid());
                this.pos_widget.action_bar.set_button_disabled('invoice', !this.is_paid());
            }
        },
        is_paid: function(){
            var currentOrder = this.pos.get('selectedOrder');
            return (currentOrder.getTotalTaxIncluded() < 0.000001 
                   || currentOrder.getPaidTotal() + 0.000001 >= currentOrder.getTotalTaxIncluded());

        },
        validate_order: function(options) {
            var self = this;
            options = options || {};

            var currentOrder = this.pos.get('selectedOrder');

            if(currentOrder.get('orderLines').models.length === 0){
                this.pos_widget.screen_selector.show_popup('error',{
                    'message': _t('Empty Order'),
                    'comment': _t('There must be at least one product in your order before it can be validated'),
                });
                return;
            }

            var plines = currentOrder.get('paymentLines').models;
            for (var i = 0; i < plines.length; i++) {
                if (plines[i].get_type() === 'bank' && plines[i].get_amount() < 0) {
                    this.pos_widget.screen_selector.show_popup('error',{
                        'message': _t('Negative Bank Payment'),
                        'comment': _t('You cannot have a negative amount in a Bank payment. Use a cash payment method to return money to the customer.'),
                    });
                    return;
                }
            }

            if(!this.is_paid()){
                return;
            }

            // The exact amount must be paid if there is no cash payment method defined.
            if (Math.abs(currentOrder.getTotalTaxIncluded() - currentOrder.getPaidTotal()) > 0.00001) {
                var cash = false;
                for (var i = 0; i < this.pos.cashregisters.length; i++) {
                    cash = cash || (this.pos.cashregisters[i].journal.type === 'cash');
                }
                if (!cash) {
                    this.pos_widget.screen_selector.show_popup('error',{
                        message: _t('Cannot return change without a cash payment method'),
                        comment: _t('There is no cash payment method available in this point of sale to handle the change.\n\n Please pay the exact amount or add a cash payment method in the point of sale configuration'),
                    });
                    return;
                }
            }

            if (this.pos.config.iface_cashdrawer) {
                    this.pos.proxy.open_cashbox();
            }

            if(options.invoice){
                // deactivate the validation button while we try to send the order
                this.pos_widget.action_bar.set_button_disabled('validation',true);
                this.pos_widget.action_bar.set_button_disabled('invoice',true);

                var invoiced = this.pos.push_and_invoice_order(currentOrder);

                invoiced.fail(function(error){
                    if(error === 'error-no-client'){
                        self.pos_widget.screen_selector.show_popup('error',{
                            message: _t('An anonymous order cannot be invoiced'),
                            comment: _t('Please select a client for this order. This can be done by clicking the order tab'),
                        });
                    }else{
                        self.pos_widget.screen_selector.show_popup('error',{
                            message: _t('The order could not be sent'),
                            comment: _t('Check your internet connection and try again.'),
                        });
                    }
                    self.pos_widget.action_bar.set_button_disabled('validation',false);
                    self.pos_widget.action_bar.set_button_disabled('invoice',false);
                });
                var thisd = this;
                invoiced.done(function(){
                    thisd.pos.push_order(currentOrder) 
                    if(thisd.pos.config.iface_print_via_proxy){
                        var receipt = currentOrder.export_for_printing();
                        thisd.pos.proxy.print_receipt(QWeb.render('XmlReceipt',{
                            receipt: receipt, widget: self,
                        }));
                        thisd.pos_widget.screen_selector.set_current_screen(thisd.next_screen);
                         //finish order and go back to scan screen
                    }else{
                        thisd.pos_widget.screen_selector.set_current_screen(thisd.next_screen);
                    }  
                    //self.pos.get('selectedOrder').destroy();
                });

 

            }
            // hide onscreen (iOS) keyboard 
            setTimeout(function(){
                document.activeElement.blur();
                $("input").blur();
            },250);
        },
        enable_numpad: function(){
            this.disable_numpad();  //ensure we don't register the callbacks twice
            this.numpad_state = this.pos_widget.numpad.state;
            if(this.numpad_state){
                this.numpad_state.reset();
                this.numpad_state.changeMode('payment');
                this.numpad_state.bind('set_value',   this.set_value, this);
                this.numpad_state.bind('change:mode', this.set_mode_back_to_payment, this);
            }
                    
        },
        disable_numpad: function(){
            if(this.numpad_state){
                this.numpad_state.unbind('set_value',  this.set_value);
                this.numpad_state.unbind('change:mode',this.set_mode_back_to_payment);
            }
        },
        set_mode_back_to_payment: function() {
            this.numpad_state.set({mode: 'payment'});
        },
        set_value: function(val) {
            var selected_line =this.pos.get('selectedOrder').selected_paymentline;
            if(selected_line){
                selected_line.set_amount(val);
                selected_line.node.querySelector('input').value = selected_line.amount.toFixed(2);
            }
        },
    });


    var PosModelSuperInvoice = module.PosModel;
    module.PosModel = module.PosModel.extend({
        //for add one field in pos.session object for holding session client.
        load_server_data: function() {
            var self = this;
            self.models[8]['fields'].push('client_session');
            return PosModelSuperInvoice.prototype.load_server_data.call(this);
        },

        //for stop generate pdf.
        push_and_invoice_order: function(order){
            var self = this;
            var invoiced = new $.Deferred(); 

            if(!order.get_client()){
                invoiced.reject('error-no-client');
                return invoiced;
            }

            var order_id = this.db.add_order(order.export_as_JSON());

            this.flush_mutex.exec(function(){
                var done = new $.Deferred(); // holds the mutex

                // send the order to the server
                // we have a 30 seconds timeout on this push.
                // FIXME: if the server takes more than 30 seconds to accept the order,
                // the client will believe it wasn't successfully sent, and very bad
                // things will happen as a duplicate will be sent next time
                // so we must make sure the server detects and ignores duplicated orders

                var transfer = self._flush_orders([self.db.get_order(order_id)], {timeout:30000, to_invoice:true});
                
                transfer.fail(function(){
                    invoiced.reject('error-transfer');
                    done.reject();
                });

                // on success, get the order id generated by the server
                transfer.pipe(function(order_server_id){    

                    invoice_number = order_server_id;
                    // generate the pdf and download it
                    //self.pos_widget.do_action('point_of_sale.pos_invoice_report',{additional_context:{ 
                    //    active_ids:order_server_id,
                    //}});

                    invoiced.resolve();
                    done.resolve();
                });

                return done;

            });

            return invoiced;
        },
    });
};

openerp.pos_invoice_extended = function(instance) {
var module = instance.point_of_sale;
pos_invoice(instance,module);
};