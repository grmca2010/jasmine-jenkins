describe('setTimeout', function(){
	beforeEach(function(){
		jasmine.Clock.useMock();
	});

	it('takes an anonymous function callback', function(){
		var a = 0;

		setTimeout(function(){
			a++;
		}, 100);

		expect(a).toBe(0);

		jasmine.Clock.tick(101);
		expect(a).toBe(1);

		jasmine.Clock.tick(100);
		expect(a).toBe(1);
	});

	it('takes a variable callback', function(){
		var a = 0, func = function(){
			a++;
		};

		setTimeout(func, 100);

		expect(a).toBe(0);

		jasmine.Clock.tick(101);
		expect(a).toBe(1);

		jasmine.Clock.tick(100);
		expect(a).toBe(1);

	});
});